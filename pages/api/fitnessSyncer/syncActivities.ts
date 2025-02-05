import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";

const SHEET_NAME_ACTIVITY_LOG = "ActivityLog";

// Helper function to calculate Zone 2 percentages
function calculateZonePercentages(points: any[], z2Min: number, z2Max: number) {
  const totalPoints = points.length;
  let inZ2 = 0;
  let aboveZ2 = 0;
  let belowZ2 = 0;

  points.forEach((point) => {
    const hr = point?.heartRate;
    if (hr === undefined) return;
    if (hr >= z2Min && hr <= z2Max) {
      inZ2++;
    } else if (hr > z2Max) {
      aboveZ2++;
    } else {
      belowZ2++;
    }
  });

  return {
    z2_percent: totalPoints > 0 ? ((inZ2 / totalPoints) * 100).toFixed(2) : "N/A",
    above_z2_percent: totalPoints > 0 ? ((aboveZ2 / totalPoints) * 100).toFixed(2) : "N/A",
    below_z2_percent: totalPoints > 0 ? ((belowZ2 / totalPoints) * 100).toFixed(2) : "N/A",
  };
}

// Helper function to calculate pace (hh:mm:ss per km)
function calculatePace(durationMs: number, distanceKm: number) {
  if (!distanceKm || distanceKm <= 0) return "N/A";
  const paceMs = durationMs / distanceKm;
  const minutes = Math.floor(paceMs / 60000);
  const seconds = Math.floor((paceMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Helper function to find maxHeart across all laps
function findMaxHeartRate(laps: any[]) {
  let maxHeart = 0;
  laps.forEach((lap) => {
    if (lap.maxHeart && lap.maxHeart > maxHeart) {
      maxHeart = lap.maxHeart;
    }
  });
  return maxHeart || "N/A";
}

// Helper function to format time in hh:mm:ss
function formatTime(ms: number) {
  if (!ms || ms < 0) return "N/A";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// Helper function to get the most recent activity timestamp from the spreadsheet
async function getMostRecentActivityTimestamp(auth: any) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME_ACTIVITY_LOG}!A2:B`, // Assuming date and timestamp are in columns A and B
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return null; // No existing data
  }

  // Get the last row (most recent activity)
  const lastRow = rows[rows.length - 1];
  const [date, timestamp] = lastRow;

  // Combine date and timestamp into a single Date object
  const mostRecentTimestamp = new Date(`${date}T${timestamp}`);
  return mostRecentTimestamp;
}

async function writeToActivityLogSheet(auth: any, data: any[]) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME_ACTIVITY_LOG}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: data.map((activity) => [
        activity.date,
        activity.timestamp,
        activity.exercise_type,
        activity.duration,
        activity.distance,
        activity.avg_hr,
        activity.max_hr,
        activity.z2_percent,
        activity.above_z2_percent,
        activity.below_z2_percent,
        activity.pace,
        "", // Route (optional)
        activity.notes || "",
        activity.isIncomplete, // Flag for incomplete data
        activity.itemId,
        activity.source, // Source name
      ]),
    },
  });

  console.log("Google Sheets write response:", response.data);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dataSourceId = "69653ce2-f3b5-4320-88b9-200ce81e79cf"; // Hardcoded Garmin dataSourceId
    const accessToken = await getValidAccessToken();

    console.log("Fetching activities from FitnessSyncer...");
    const response = await fetch(
      `https://api.fitnesssyncer.com/api/providers/sources/${dataSourceId}/items/?limit=100`, // Limit to the latest 100 items
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
    }

    const activitiesResponse = (await response.json()) as { items: any[] };
    let activities = activitiesResponse.items || [];
    console.log(`Fetched ${activities.length} activities from FitnessSyncer.`);

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    // Get the most recent activity timestamp from the spreadsheet
    const mostRecentTimestamp = await getMostRecentActivityTimestamp(auth);
    console.log("Most recent activity timestamp:", mostRecentTimestamp);

    // Filter out "Generic" activities and activities already in the spreadsheet
    activities = activities.filter((activity) => {
      const activityTimestamp = new Date(Number(activity.date));
      if (mostRecentTimestamp && activityTimestamp <= mostRecentTimestamp) {
        return false; // Exclude this activity
      }

      const activityType =
        activity.fitnessSyncerActivity !== "Other" && activity.fitnessSyncerActivity
          ? activity.fitnessSyncerActivity
          : activity.activity || activity.gps?.sport || "Unknown";

      return activityType.toLowerCase() !== "generic"; // Exclude "Generic" activities
    });

    const transformedActivities = activities.map((activity) => {
      const gpsData = activity.gps;
      const laps = gpsData?.lap || [];
      const lapPoints = gpsData?.lap?.[0]?.points || [];
      const maxHeart = laps.length ? findMaxHeartRate(laps) : "N/A";

      const exerciseType =
        activity.fitnessSyncerActivity !== "Other" && activity.fitnessSyncerActivity
          ? activity.fitnessSyncerActivity
          : activity.activity || gpsData?.sport || "Unknown";

      const activityTimestamp = activity.date;
      const activityDate = activityTimestamp
        ? new Date(Number(activityTimestamp))
        : null;

      if (!activityDate || isNaN(activityDate.getTime())) {
        console.error(`Invalid or missing date for itemId: ${activity.itemId}`);
      }

      const formattedDate = activityDate ? activityDate.toISOString().split("T")[0] : "N/A";
      const formattedTimestamp = activityDate
        ? activityDate.toLocaleTimeString("en-US", { hour12: false })
        : "N/A";

      const { z2_percent, above_z2_percent, below_z2_percent } = calculateZonePercentages(
        lapPoints,
        123,
        133
      );

      return {
        date: formattedDate,
        timestamp: formattedTimestamp,
        exercise_type: exerciseType,
        duration: formatTime(activity.duration * 1000),
        distance: activity.distanceKM ? activity.distanceKM.toFixed(2) : "0.00",
        avg_hr: activity.avgHeartrate || "N/A",
        max_hr: maxHeart,
        z2_percent: lapPoints.length > 0 ? z2_percent : "N/A",
        above_z2_percent: lapPoints.length > 0 ? above_z2_percent : "N/A",
        below_z2_percent: lapPoints.length > 0 ? below_z2_percent : "N/A",
        pace:
          activity.duration && activity.distanceKM
            ? calculatePace(activity.duration * 1000, activity.distanceKM)
            : "N/A",
        notes: gpsData ? "" : "Incomplete GPS data",
        isIncomplete: !gpsData,
        itemId: activity.itemId,
        source: activity.providerType,
      };
    });

    const sortedActivities = transformedActivities.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    await writeToActivityLogSheet(auth, sortedActivities);

    res
      .status(200)
      .json({ message: "Sync successful", activitiesCount: sortedActivities.length });
  } catch (error: any) {
    console.error("Error syncing activities:", error.message);
    res.status(500).json({ error: error.message });
  }
}
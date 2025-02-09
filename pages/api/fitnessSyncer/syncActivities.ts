import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";
import axios from "axios";

async function triggerWeeklyMetricsCalculation() {
  try {
    console.log("Triggering weekly metrics calculation...");
    await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calculateWeeklyMetrics`);
    console.log("Weekly metrics calculation completed successfully.");
  } catch (error) {
    console.error("Error triggering weekly metrics calculation:", error);
  }
}

const SHEET_NAME_ACTIVITY_LOG = "ActivityLog";

// Helper functions (unchanged)
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

function calculatePace(durationMs: number, distanceKm: number) {
  if (!distanceKm || distanceKm <= 0) return "N/A";
  const paceMs = durationMs / distanceKm;
  const minutes = Math.floor(paceMs / 60000);
  const seconds = Math.floor((paceMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function findMaxHeartRate(laps: any[]) {
  let maxHeart = 0;
  laps.forEach((lap) => {
    if (lap.maxHeart && lap.maxHeart > maxHeart) {
      maxHeart = lap.maxHeart;
    }
  });
  return maxHeart || "N/A";
}

function formatTime(ms: number) {
  if (!ms || ms < 0) return "N/A";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

async function getMostRecentActivityTimestamp(auth: any) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME_ACTIVITY_LOG}!A2:B`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return null;
  }

  const lastRow = rows[rows.length - 1];
  const [date, timestamp] = lastRow;

  return new Date(`${date}T${timestamp}`);
}

async function writeToActivityLogSheet(auth: any, data: any[]) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  await sheets.spreadsheets.values.append({
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
        "",
        activity.notes || "",
        activity.isIncomplete,
        activity.itemId,
        activity.source,
      ]),
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const dataSourceId = "69653ce2-f3b5-4320-88b9-200ce81e79cf";
      const accessToken = await getValidAccessToken();

      console.log("Fetching activities from FitnessSyncer...");
      const response = await fetch(
        `https://api.fitnesssyncer.com/api/providers/sources/${dataSourceId}/items/?limit=100`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
      }

      const activitiesResponse = (await response.json()) as { items: any[] };
      let activities = activitiesResponse.items || [];

      const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        undefined,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets"]
      );

      const mostRecentTimestamp = await getMostRecentActivityTimestamp(auth);

      activities = activities.filter((activity) => {
        const activityTimestamp = new Date(Number(activity.date));
        if (mostRecentTimestamp && activityTimestamp <= mostRecentTimestamp) {
          return false;
        }

        const activityType =
          activity.fitnessSyncerActivity !== "Other" && activity.fitnessSyncerActivity
            ? activity.fitnessSyncerActivity
            : activity.activity || activity.gps?.sport || "Unknown";

        return activityType.toLowerCase() !== "generic";
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

      await writeToActivityLogSheet(auth, transformedActivities);
      await triggerWeeklyMetricsCalculation();

      res
        .status(200)
        .json({ message: "Sync successful", newActivities: transformedActivities.length });
    } catch (error: any) {
      console.error("Error syncing activities:", error.message);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
  }
}
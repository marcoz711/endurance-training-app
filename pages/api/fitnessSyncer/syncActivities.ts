import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";
import axios from "axios";
import { GoogleSheetsService } from "../../../services/googleSheets";
import { handleApiError } from "../../../utils/errors";
import { withRateLimit } from "../../../middleware/rateLimit";
import { ActivityLogEntry } from "../../../types/activity";
import { validateActivityLog } from "../../../utils/validation";

const SHEET_NAME_ACTIVITY_LOG = "ActivityLog";

async function triggerWeeklyMetricsCalculation() {
  try {
    console.log("Triggering weekly metrics calculation...");
    await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calculateWeeklyMetrics`);
    console.log("Weekly metrics calculation completed successfully.");
  } catch (error) {
    console.error("Error triggering weekly metrics calculation:", error);
  }
}

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

async function getSourceId(service: GoogleSheetsService): Promise<string> {
  try {
    console.log('Attempting to read from Google Sheets...');
    const response = await service.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'FitnessSyncerDataSources!A2:B2',
    });

    console.log('Google Sheets response:', response.data);

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No source ID found in FitnessSyncerDataSources sheet');
    }

    const sourceId = rows[0][0];
    console.log('Raw source ID from sheet:', sourceId);

    if (!sourceId) {
      throw new Error('Source ID is empty in FitnessSyncerDataSources sheet');
    }

    console.log('Successfully retrieved source ID:', sourceId);
    return sourceId.trim(); // Add trim() to remove any potential whitespace
  } catch (error) {
    console.error('Error fetching source ID:', error);
    throw new Error(`Failed to get source ID: ${error.message}`);
  }
}

const fetchActivities = async (accessToken: string, sourceId: string) => {
  console.log('Making API call with:', {
    sourceId,
    accessToken: accessToken ? 'present' : 'missing'
  });

  const url = `https://api.fitnesssyncer.com/api/providers/sources/${sourceId}/items/`;
  console.log('API URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FitnessSyncer API error response:', {
      status: response.status,
      errorText,
      headers: Object.fromEntries(response.headers.entries())
    });
    throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
  }

  const activitiesResponse = await response.json() as { items: any[] };
  console.log('Raw FitnessSyncer response sample:', {
    firstActivity: activitiesResponse.items[0],
    hasItemId: Boolean(activitiesResponse.items[0]?.itemId),
    itemIdValue: activitiesResponse.items[0]?.itemId
  });
  return activitiesResponse;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const service = new GoogleSheetsService();
    const accessToken = await getValidAccessToken();
    
    console.log("Getting source ID from Google Sheets...");
    const sourceId = await getSourceId(service);
    
    console.log("Fetching activities from FitnessSyncer...");
    const response = await fetchActivities(accessToken, sourceId);

    const activitiesResponse = response;
    const activities = activitiesResponse.items || [];

    const mostRecentActivity = await service.getMostRecentActivity();
    console.log('Most recent activity in sheet:', mostRecentActivity);

    const mostRecentTimestamp = mostRecentActivity 
      ? new Date(`${mostRecentActivity.date}T${mostRecentActivity.timestamp}`).getTime()
      : null;

    console.log('Most recent timestamp:', mostRecentTimestamp);

    const filteredActivities = activities.filter(activity => {
      const activityTimestamp = new Date(Number(activity.date)).getTime();
      console.log(`Comparing activity ${new Date(activityTimestamp).toISOString()} with most recent ${mostRecentTimestamp ? new Date(mostRecentTimestamp).toISOString() : 'none'}`);
      return !mostRecentTimestamp || activityTimestamp > mostRecentTimestamp;
    });

    // Sort activities by date and time, oldest first
    const sortedActivities = filteredActivities.sort((a, b) => {
      const timeA = new Date(Number(a.date)).getTime();
      const timeB = new Date(Number(b.date)).getTime();
      return timeA - timeB;
    });

    const transformedActivities: ActivityLogEntry[] = sortedActivities.map(activity => {
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

      const transformedActivity = {
        date: formattedDate,
        timestamp: formattedTimestamp,
        exercise_type: exerciseType,
        duration: formatTime(activity.duration * 1000),
        distance: activity.distanceKM ? activity.distanceKM.toFixed(2) : "0.00",
        avg_hr: (activity.avgHeartrate || "N/A").toString(),
        max_hr: maxHeart.toString(),
        z2_percent: lapPoints.length > 0 ? z2_percent : "N/A",
        above_z2_percent: lapPoints.length > 0 ? above_z2_percent : "N/A",
        below_z2_percent: lapPoints.length > 0 ? below_z2_percent : "N/A",
        pace: activity.duration && activity.distanceKM
          ? calculatePace(activity.duration * 1000, activity.distanceKM)
          : "N/A",
        notes: gpsData ? "" : "Incomplete GPS data",
        isIncomplete: !gpsData,
        itemId: activity.itemId,
        source: activity.providerType,
      };

      console.log('Transformed activity with itemId:', {
        itemId: activity.itemId,
        transformedItemId: transformedActivity.itemId,
        activityDate: transformedActivity.date
      });

      return transformedActivity;
    });

    const validatedActivities = transformedActivities.map(activity => 
      validateActivityLog(activity)
    );

    console.log(`Writing ${validatedActivities.length} new activities to sheet`);
    await service.updateActivityLog(validatedActivities);
    await triggerWeeklyMetricsCalculation();

    console.log('Sample of activities to be written:', transformedActivities.slice(0, 2));

    res.status(200).json({ 
      message: "Sync successful", 
      newActivities: validatedActivities.length 
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}

export default withRateLimit(handler);
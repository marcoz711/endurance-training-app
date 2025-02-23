import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";
import axios from "axios";
import { GoogleSheetsService } from "../../../services/googleSheets";
import { withRateLimit } from "../../../middleware/rateLimit";
import { ActivityLogEntry } from "../../../types/activity";
import { validateActivityLog } from "../../../utils/validation";
import { handleApiError } from '../../../utils/errors';

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
    if (hr >= z2Min && hr <= z2Max) {  // Z2 range: 123-138
      inZ2++;
    } else if (hr > z2Max) {  // Above 138
      aboveZ2++;
    } else {  // Below 123
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

async function getMostRecentActivityTimestamp(service: GoogleSheetsService) {
  const mostRecentActivity = await service.getMostRecentActivity();
  return mostRecentActivity ? new Date(`${mostRecentActivity.date}T${mostRecentActivity.timestamp}`) : null;
}

async function writeToActivityLogSheet(service: GoogleSheetsService, data: any[]) {
  // Log the first activity to debug
  console.log("First activity MAF zone:", data[0]?.mafZonePercent);

  await service.updateActivityLog(data);
}

async function getSourceId(service: GoogleSheetsService): Promise<string> {
  try {
    const response = await service.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'FitnessSyncerDataSources!A2:B2',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No source ID found in FitnessSyncerDataSources sheet');
    }

    const sourceId = rows[0][0];
    if (!sourceId) {
      throw new Error('Source ID is empty in FitnessSyncerDataSources sheet');
    }

    return sourceId.trim();
  } catch (error) {
    console.error('Error fetching source ID:', error);
    throw new Error(`Failed to get source ID: ${error.message}`);
  }
}

const fetchActivities = async (accessToken: string, sourceId: string) => {
  const url = `https://api.fitnesssyncer.com/api/providers/sources/${sourceId}/items/`;

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
  return activitiesResponse;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const service = GoogleSheetsService.getInstance();
    
    // Test call using the getSheetValues method
    try {
      await service.getSheetValues({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'A1:A1'
      });
    } catch (error) {
      console.error('Test call failed:', error);
      throw error;
    }
    
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new Error("Failed to get valid access token");
    }
    
    const sourceId = await getSourceId(service);
    if (!sourceId) {
      throw new Error("Failed to get source ID");
    }
    
    const response = await fetchActivities(accessToken, sourceId);
    if (!response || !response.items) {
      throw new Error("Invalid response from FitnessSyncer");
    }

    const activities = response.items || [];
    const mostRecentTimestamp = await getMostRecentActivityTimestamp(service);

    // Adding minimum date threshold
    const minDateThreshold = new Date('2024-12-03').getTime();

    const filteredActivities = activities.filter(activity => {
      const activityTimestamp = new Date(Number(activity.date)).getTime();
      return (
        (!mostRecentTimestamp || activityTimestamp > mostRecentTimestamp.getTime()) && 
        activityTimestamp >= minDateThreshold &&
        activity.activity !== 'Generic'
      );
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

      // Calculate MAF zone percentage with fixed range 123-133
      let mafZonePercent = "N/A";
      if (lapPoints.length > 0) {
        const heartRatePoints = lapPoints.filter(point => point.heartRate);
        const mafZoneSeconds = heartRatePoints.reduce((acc, point) => {
          const hr = point.heartRate;
          return acc + (hr >= 123 && hr <= 133 ? 1 : 0);  // Fixed MAF zone range
        }, 0);
        
        if (heartRatePoints.length > 0) {
          mafZonePercent = ((mafZoneSeconds / heartRatePoints.length) * 100).toFixed(1);
        }
      }

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
        ? activityDate.toLocaleTimeString("en-US", { 
            hour12: false,
            timeZone: 'Europe/Berlin'
          })
        : "N/A";

      const { z2_percent, above_z2_percent, below_z2_percent } = calculateZonePercentages(
        lapPoints,
        123,  // Z2 lower limit
        138   // Z2 upper limit - changed from 133 to 138
      );

      // Add logging for MAF zone calculation
      console.log('MAF Zone Calculation:', {
        heartRatePoints: lapPoints.filter(point => point.heartRate).length,
        mafZonePercent,
        raw: lapPoints.slice(0, 3) // Show first 3 points as sample
      });

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
        mafZonePercent: mafZonePercent === "N/A" ? 0 : parseFloat(mafZonePercent),
        pace: activity.duration && activity.distanceKM
          ? calculatePace(activity.duration * 1000, activity.distanceKM)
          : "N/A",
        notes: gpsData ? "" : "Incomplete GPS data",
        isIncomplete: !gpsData,
        itemId: activity.itemId,
        source: activity.providerType,
      };

      // Log the transformed activity
      console.log('Transformed Activity MAF:', {
        mafZonePercent: transformedActivity.mafZonePercent
      });

      return transformedActivity;
    });

    const validatedActivities = transformedActivities.map(activity => 
      validateActivityLog(activity)
    );

    // After validation
    console.log('First validated activity:', {
      mafZone: validatedActivities[0]?.mafZonePercent,
      fullActivity: validatedActivities[0]
    });

    // Before calling updateActivityLog
    console.log('Activities to be logged:', transformedActivities);

    await writeToActivityLogSheet(service, transformedActivities);
    await triggerWeeklyMetricsCalculation();

    res.status(200).json({ 
      message: "Activities synced successfully", 
      newActivities: transformedActivities.length 
    });
  } catch (error) {
    const { statusCode, body } = handleApiError(error);
    res.status(statusCode).json(body);
  }
}

export default withRateLimit(handler);
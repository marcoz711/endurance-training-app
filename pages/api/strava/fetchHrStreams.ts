// pages/api/strava/fetchHrStreams.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import axios from "axios";
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "@/src/config";

async function getTokensFromGoogleSheets() {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: "Config!A2:C2",
  });

  const values = response.data.values || [];
  const [accessToken] = values[0] || [];

  return { accessToken };
}

async function fetchHrStreamWithTimestamps(accessToken: string, activityId: string) {
  const response = await axios.get(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const hrStream = response.data.heartrate?.data || [];
  const timeStream = response.data.time?.data || [];

  return hrStream.map((hrValue: number, index: number) => ({
    time: timeStream[index] || null, // Time offset in seconds
    heartrate: hrValue,
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken } = await getTokensFromGoogleSheets();

    // Fetch recent activities
    const activitiesResponse = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities?per_page=10",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const activities = activitiesResponse.data;

    // Filter for the last 3 runs
    const runs = activities.filter((activity: any) => activity.type === "Run").slice(0, 3);

    // Fetch HR streams with timestamps for each run
    const hrStreamsWithTimestamps = await Promise.all(
      runs.map(async (run: any) => {
        const hrStreamWithTimestamps = await fetchHrStreamWithTimestamps(accessToken, run.id);
        return { activityId: run.id, hrStreamWithTimestamps };
      })
    );

    return res.status(200).json({ hrStreams: hrStreamsWithTimestamps });
  } catch (error: any) {
    console.error("Error fetching HR streams:", error.message);
    return res.status(500).json({ error: "Failed to fetch HR streams" });
  }
}
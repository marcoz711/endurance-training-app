// pages/api/strava/fetchActivities.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import axios from 'axios';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '@/src/config';
import logActivityHandler from '../logActivity';

const PERSON_MAX_HR = 178; // Hardcoded maxHR for zone calculations (person-specific)

async function getTokensFromGoogleSheets() {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: 'Config!A2:C2',
  });

  const values = response.data.values || [];
  const [accessToken] = values[0] || [];

  return { accessToken };
}

async function fetchActivityDetails(accessToken: string, activityId: string) {
  const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}/streams`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      keys: 'heartrate',
      key_by_type: true,
      resolution: 'high',
      series_type: 'time',
    },
  });

  return response.data;
}

function calculateHRPercentages(heartrateStream: number[], personMaxHR: number) {
  const zone2Lower = Math.round(personMaxHR * 0.6);
  const zone2Upper = Math.round(personMaxHR * 0.7);

  let belowZone2 = 0,
    inZone2 = 0,
    aboveZone2 = 0;

  heartrateStream.forEach((hr) => {
    if (hr < zone2Lower) belowZone2++;
    else if (hr <= zone2Upper) inZone2++;
    else aboveZone2++;
  });

  const total = heartrateStream.length;
  const z2Percent = Math.round((inZone2 / total) * 100);
  const aboveZ2Percent = Math.round((aboveZone2 / total) * 100);
  const belowZ2Percent = Math.round((belowZone2 / total) * 100);

  console.log(`Heart Rate Zones for MAX_HR ${personMaxHR} BPM:`);
  console.log(`Zone 2: ${zone2Lower}-${zone2Upper} BPM (${z2Percent}%)`);
  console.log(`Above Zone 2: >${zone2Upper} BPM (${aboveZ2Percent}%)`);
  console.log(`Below Zone 2: <${zone2Lower} BPM (${belowZ2Percent}%)`);

  return { z2_percent: z2Percent, above_z2_percent: aboveZ2Percent, below_z2_percent: belowZ2Percent };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken } = await getTokensFromGoogleSheets();

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token found. Reauthorize the app.' });
    }

    // Fetch recent activities
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        per_page: 10, // Fetch the last 10 activities for filtering
      },
    });

    const recentActivities = activitiesResponse.data;

    // Find the most recent "Run" activity
    const runActivity = recentActivities.find((activity: any) => activity.type === 'Run');

    if (!runActivity) {
      return res.status(404).json({ error: 'No recent running activities found.' });
    }

    const maxHR = runActivity.max_heartrate || PERSON_MAX_HR;

    // Fetch heart rate data for the last running activity
    const heartRateStream = await fetchActivityDetails(accessToken, runActivity.id);
    const heartrateData = heartRateStream.heartrate?.data || [];
    const originalSize = heartRateStream.heartrate?.original_size || 0;

    if (!heartrateData.length) {
      console.error(`No heart rate data found for activity ${runActivity.id}.`);
      return res.status(400).json({ error: 'No heart rate data available for activity.' });
    }

    // Calculate HR zone percentages
    const { z2_percent, above_z2_percent, below_z2_percent } = calculateHRPercentages(heartrateData, PERSON_MAX_HR);

    // Prepare activity data for logging
    const activityData = {
      date: runActivity.start_date_local.split('T')[0],
      timestamp: runActivity.start_date_local.split('T')[1],
      exercise_type: 'Run',
      duration: new Date(runActivity.moving_time * 1000).toISOString().substr(11, 8),
      distance: (runActivity.distance / 1000).toFixed(2),
      avg_hr: runActivity.average_heartrate,
      max_hr: maxHR, // Activity-specific maxHR
      z2_percent,
      above_z2_percent,
      below_z2_percent,
      pace: '', // Optional
      notes: `Imported from Strava: ${runActivity.name}`,
      heartrate_stream: heartrateData, // Include heart rate stream in the response
      original_size: originalSize, // Include original size
    };

    // Log data in the console for verification
    console.log('Fetched running activity data from Strava:', activityData);

    if (req.method === 'GET') {
      // Return the fetched data including heart rate stream for debugging
      return res.status(200).json(activityData);
    }

    // Reuse logActivityHandler for POST requests
    req.body = activityData;
    await logActivityHandler(req, res);
  } catch (error) {
    console.error('Error fetching or logging activity:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch or log activity.' });
  }
}

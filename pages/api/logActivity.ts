// pages/api/logActivity.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const validateRequestBody = (body: any) => {
  const durationPattern = /^(\d{2}):(\d{2}):(\d{2})$/;
  const pacePattern = /^(\d{2}):(\d{2}):(\d{2})$/;

  if (!body.date || !body.timestamp || !body.exercise_type || !body.duration) {
    throw new Error('Required fields are missing.');
  }
  if (!durationPattern.test(body.duration)) {
    throw new Error('Duration must be in HH:MM:SS format');
  }
  if (body.pace && !pacePattern.test(body.pace)) {
    throw new Error('Pace must be in HH:MM:SS format');
  }

  const numericFields = ['distance', 'avg_hr', 'max_hr', 'z2_percent', 'above_z2_percent', 'below_z2_percent'];
  numericFields.forEach((field) => {
    if (body[field] && isNaN(Number(body[field]))) {
      throw new Error(`${field.replace(/_/g, ' ')} must be a valid number.`);
    }
  });

  ['z2_percent', 'above_z2_percent', 'below_z2_percent'].forEach((field) => {
    if (body[field] && (Number(body[field]) < 0 || Number(body[field]) > 100)) {
      throw new Error('Percentages must be between 0 and 100');
    }
  });
};

const triggerWeeklyMetricsCalculation = async (date: string) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log('Calling calculateWeeklyMetrics API with URL:', `${baseUrl}/api/calculateWeeklyMetrics`);

    const response = await fetch(`${baseUrl}/api/calculateWeeklyMetrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Weekly metrics calculation failed with response:', errorData);
      throw new Error('Failed to calculate weekly metrics.');
    }

    console.log('Weekly metrics calculation successful.');
  } catch (error) {
    console.error('Error triggering weekly metrics calculation:', error.message);
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('logActivity API called with data:', req.body); // Verify the API call and request body

  try {
    validateRequestBody(req.body);

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const activity = req.body;

    // Transform the activity data
    const transformedActivity = {
      date: activity.date,
      max_hr: activity.max_hr,
      z2_percent: activity.z2_percent,
      above_z2_percent: activity.above_z2_percent,
      below_z2_percent: activity.below_z2_percent,
      pace: activity.pace,
      notes: activity.gps ? '' : 'Incomplete GPS data',
      // Use the provider type directly from the activity data
      source: activity.provider || activity.providerType, // Try both possible field names
      itemId: activity.itemId,
      // Set isIncomplete based on GPS data existence
      isIncomplete: !activity.gps || activity.gps.points?.length === 0
    };

    // Write to spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'ActivityLog!A:O', // Updated range to match actual columns
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          transformedActivity.date,                // A: date
          activity.timestamp,                      // B: timestamp
          activity.exercise_type,                  // C: exercise_type
          activity.duration,                       // D: duration
          activity.distance || '',                 // E: distance
          activity.avg_hr || '',                  // F: avg_hr
          transformedActivity.max_hr,             // G: max_hr
          transformedActivity.z2_percent,         // H: z2_percent
          transformedActivity.above_z2_percent,   // I: above_z2_percent
          transformedActivity.below_z2_percent,   // J: below_z2_percent
          transformedActivity.pace,               // K: pace
          transformedActivity.notes,              // L: notes
          transformedActivity.isIncomplete,       // M: isIncomplete
          transformedActivity.itemId,             // N: itemId
          transformedActivity.source              // O: source
        ]]
      }
    });

    console.log('Activity logged successfully in Google Sheets.'); // Log success for activity logging

    // Trigger weekly metrics calculation
    console.log('Attempting to trigger weekly metrics calculation...');
    await triggerWeeklyMetricsCalculation(req.body.date);

    res.status(200).json({ message: 'Activity logged successfully and metrics updated.' });
  } catch (error) {
    console.error('Error logging activity or calculating metrics:', error.message);
    res.status(400).json({ error: error.message });
  }
}
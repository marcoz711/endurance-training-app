// pages/api/logActivity.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '../../src/config';

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

    // Set up Google Sheets API client
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      undefined,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    // Append new row to ActivityLog sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'ActivityLog',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          req.body.date, req.body.timestamp, req.body.exercise_type, req.body.duration,
          req.body.distance || '', req.body.avg_hr || '', req.body.max_hr || '',
          req.body.z2_percent || '', req.body.above_z2_percent || '', req.body.below_z2_percent || '',
          req.body.pace || '', '', req.body.notes || ''
        ]],
      },
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
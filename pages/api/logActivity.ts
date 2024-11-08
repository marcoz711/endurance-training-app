// pages/api/logActivity.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '../../src/config';

// Validation function to ensure correct data format and values
const validateRequestBody = (body: any) => {
  const durationPattern = /^(\d{2}):(\d{2}):(\d{2})$/;
  const pacePattern = /^(\d{2}):(\d{2})$/;

  if (!body.date || !body.timestamp || !body.exercise_type || !body.duration) {
    throw new Error('Required fields are missing.');
  }
  if (!durationPattern.test(body.duration)) {
    throw new Error('Duration must be in HH:MM:SS format');
  }
  if (body.pace && !pacePattern.test(body.pace)) {
    throw new Error('Pace must be in MM:SS format');
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

  // Check if Zone 2 percentages sum to 100
  const totalPercentage = ['z2_percent', 'above_z2_percent', 'below_z2_percent']
    .reduce((sum, field) => sum + (Number(body[field]) || 0), 0);
  if (totalPercentage !== 100) {
    throw new Error('Zone percentages (Z2, Above Z2, Below Z2) must sum up to 100');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    date, timestamp, exercise_type, duration, distance,
    avg_hr, max_hr, z2_percent, above_z2_percent, below_z2_percent,
    pace, notes
  } = req.body;

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
          date, timestamp, exercise_type, duration, distance || '',
          avg_hr || '', max_hr || '', z2_percent || '', above_z2_percent || '', below_z2_percent || '',
          pace || '', '', notes || ''
        ]],
      },
    });

    res.status(200).json({ message: 'Activity logged successfully' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(400).json({ error: error.message });
  }
}
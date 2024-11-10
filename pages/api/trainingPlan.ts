// pages/api/trainingPlan.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '../../src/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : null;
    const endDate = end ? new Date(end as string) : null;

    // Set up Google Sheets API client with environment variables for auth
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      undefined,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'TrainingPlan', // Sheet name
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No data found in Training Plan' });
    }

    // Transform the data and filter by date range
    const data = rows.slice(1).map((row) => ({
      date: row[0] || null,
      exercise_type: row[1] || null,
      duration_planned_min: row[2] ? parseInt(row[2]) : null,
      duration_planned_max: row[3] ? parseInt(row[3]) : null,
      notes: row[4] || null,
    })).filter((entry) => {
      const entryDate = entry.date ? new Date(entry.date) : null;
      return (
        entryDate &&
        (!startDate || entryDate >= startDate) &&
        (!endDate || entryDate <= endDate)
      );
    });

    // Sort by date in ascending order
    data.sort((a, b) => (a.date > b.date ? 1 : -1));

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Training Plan data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
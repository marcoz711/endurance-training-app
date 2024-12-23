// pages/api/activityLog.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '@/src/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { startDate, endDate } = req.query;

    // Set up Google Sheets API client
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      undefined,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'ActivityLog',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No data found in Activity Log' });
    }

    // Transform and filter data
    const data = rows.slice(1).map((row) => ({
      date: row[0] || null,
      timestamp: row[1] || null,
      exercise_type: row[2] || null,
      duration: row[3] || null,
      distance: row[4] ? parseFloat(row[4]) : null,
      avg_hr: row[5] ? parseInt(row[5]) : null,
      max_hr: row[6] ? parseInt(row[6]) : null,
      z2_percent: row[7] ? parseFloat(row[7]) : null,
      above_z2_percent: row[8] ? parseFloat(row[8]) : null,
      below_z2_percent: row[9] ? parseFloat(row[9]) : null,
      pace: row[10] || null,
      route: row[11] || null,
      notes: row[12] || null,
    }));

    const filteredData = data.filter((activity) => {
      const activityDate = new Date(activity.date);
      if (startDate && new Date(startDate as string) > activityDate) return false;
      if (endDate && new Date(endDate as string) < activityDate) return false;
      return true;
    });

    // Sort by date in descending order
    filteredData.sort((a, b) => (a.date < b.date ? 1 : -1));

    res.status(200).json(filteredData);
  } catch (error) {
    console.error('Error fetching Activity Log data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
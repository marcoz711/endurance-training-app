// pages/api/progressMetrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '../../src/config';

// Helper function to format total seconds into MM:SS
function formatPace(value: string): string {
  if (value.includes(':')) {
    // Already in MM:SS format
    return value;
  }

  const totalSeconds = parseInt(value, 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
      range: 'ProgressMetrics',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No data found in Progress Metrics' });
    }

    // Transform the data
    const data = rows.slice(1).map((row) => {
      const date = row[0] || null;
      const metricType = row[1] || null;
      let value = row[2] || null;

      // Format value as MM:SS if metricType indicates it's a pace metric
      if (metricType && metricType.toLowerCase().includes("pace") && value) {
        value = formatPace(value);
      } else if (value) {
        value = parseFloat(value);
      }

      return {
        date,
        metric_type: metricType,
        value,
      };
    });

    // Sort by date in descending order
    data.sort((a, b) => (a.date < b.date ? 1 : -1));

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Progress Metrics data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
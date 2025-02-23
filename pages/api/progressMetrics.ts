// pages/api/progressMetrics.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSheetsService } from '../../services/googleSheets';

// Helper function to format total seconds into HH:MM:SS
function formatPace(value: string): string {
  if (value.includes(':')) {
    // Already in HH:MM:SS format
    return value;
  }

  const totalSeconds = parseInt(value, 10);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Remove debug log
  // console.log("Fetching progress metrics...");
  
  try {
    const service = new GoogleSheetsService();
    const response = await service.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
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

      // Format value as HH:MM:SS if metricType indicates it's a pace metric
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

    // Remove debug log
    // console.log("Progress metrics fetched successfully");
    res.status(200).json(data);
  } catch (error) {
    // Keep error logging for production debugging
    console.error("Error fetching progress metrics:", error);
    res.status(500).json({ error: "Failed to fetch progress metrics" });
  }
}
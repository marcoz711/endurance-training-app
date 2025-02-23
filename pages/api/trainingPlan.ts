// pages/api/trainingPlan.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSheetsService } from '../../services/googleSheets';
import { withRateLimit } from '../../middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : null;
    const endDate = end ? new Date(end as string) : null;

    // Validate query parameters
    if (start && isNaN(startDate!.getTime()) || end && isNaN(endDate!.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const service = new GoogleSheetsService();
    const response = await service.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'TrainingPlan',
    });

    if (!response?.data?.values) {
      return res.status(404).json({ error: 'No data found in Training Plan' });
    }

    const rows = response.data.values;
    
    // Transform and filter the data
    const data = rows.slice(1)
      .map(row => ({
        date: row[0] || null,
        exercise_type: row[1] || null,
        duration_planned_min: row[2] ? parseInt(row[2]) : null,
        duration_planned_max: row[3] ? parseInt(row[3]) : null,
        notes: row[4] || null,
      }))
      .filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        if (isNaN(entryDate.getTime())) return false;
        
        return (!startDate || entryDate >= startDate) && 
               (!endDate || entryDate <= endDate);
      });

    // Sort by date
    data.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    res.status(200).json(data);
  } catch (error) {
    console.error('Error in training plan API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Wrap the handler with rate limiting
export default withRateLimit(handler);
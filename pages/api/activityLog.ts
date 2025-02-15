// pages/api/activityLog.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSheetsService } from '../../services/googleSheets';
import { handleApiError } from '../../utils/errors';
import { withRateLimit } from '../../middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;
    
    // Validate date parameters
    if (startDate && isNaN(new Date(startDate as string).getTime()) || 
        endDate && isNaN(new Date(endDate as string).getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const service = new GoogleSheetsService();
    const data = await service.getActivityLog();
    
    const filteredData = data.filter((activity) => {
      if (!activity.date) return false;
      const activityDate = new Date(activity.date);
      if (isNaN(activityDate.getTime())) return false;
      
      if (startDate && new Date(startDate as string) > activityDate) return false;
      if (endDate && new Date(endDate as string) < activityDate) return false;
      return true;
    });

    res.status(200).json(filteredData);
  } catch (error) {
    const { statusCode, body } = handleApiError(error);
    res.status(statusCode).json(body);
  }
}

export default withRateLimit(handler);
// pages/api/logActivity.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { validateActivityLogRequest } from '../../utils/validation';
import { handleApiError } from '../../utils/errors';
import { GoogleSheetsService } from '../../services/googleSheets';

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

  try {
    const validation = validateActivityLogRequest(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    const service = GoogleSheetsService.getInstance();
    const activity = validation.data;  // Now properly typed

    // Transform the activity data
    const transformedActivity = {
      date: activity.date,
      timestamp: activity.timestamp,
      exercise_type: activity.exercise_type,
      duration: activity.duration,
      distance: activity.distance,
      avg_hr: activity.avg_hr?.toString() || 'N/A',
      max_hr: activity.max_hr?.toString() || 'N/A',
      z2_percent: activity.z2_percent?.toString() || 'N/A',
      above_z2_percent: activity.above_z2_percent?.toString() || 'N/A',
      below_z2_percent: activity.below_z2_percent?.toString() || 'N/A',
      maf_zone_percent: activity.maf_zone_percent?.toString() || 'N/A',
      pace: activity.pace,
      notes: activity.gps ? '' : 'Incomplete GPS data',
      source: activity.provider || activity.providerType, // Try both possible field names
      itemId: activity.itemId,
      isIncomplete: !activity.gps || activity.gps.points?.length === 0
    };

    // Write to spreadsheet
    await service.updateActivityLog([transformedActivity]);

    // Trigger weekly metrics calculation
    console.log('Attempting to trigger weekly metrics calculation...');
    await triggerWeeklyMetricsCalculation(req.body.date);

    res.status(200).json({ message: 'Activity logged successfully and metrics updated.' });
  } catch (error) {
    const { statusCode, body } = handleApiError(error);
    res.status(statusCode).json(body);
  }
}
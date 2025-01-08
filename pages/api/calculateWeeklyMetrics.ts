// pages/api/calculateWeeklyMetrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Utility to parse pace (HH:MM:SS) into total seconds
function parsePace(pace: string): number {
  const [hours, minutes, seconds] = pace.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

// Utility to convert seconds into HH:MM:SS format
function secondsToHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Get the Monday of the week for a given date
function getMondayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday adjustment
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set up Google Sheets API client
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch all activity logs from the "ActivityLog" sheet
    const activityData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'ActivityLog',
    });

    const activityRows = activityData.data.values || [];
    const headers = activityRows.shift(); // Remove headers row
    if (!headers) {
      return res.status(400).json({ error: 'No activity logs found in the sheet.' });
    }

    const dateIndex = headers.indexOf('date');
    const z2PercentIndex = headers.indexOf('z2_percent');
    const paceIndex = headers.indexOf('pace');
    const exerciseTypeIndex = headers.indexOf('exercise_type');

    // Group activities by weeks
    const activitiesByWeeks = new Map<string, any[]>();
    for (const row of activityRows) {
      const activityDate = new Date(row[dateIndex]);
      const weekStart = getMondayOfWeek(activityDate).toISOString().split('T')[0];
      if (!activitiesByWeeks.has(weekStart)) activitiesByWeeks.set(weekStart, []);
      activitiesByWeeks.get(weekStart)?.push(row);
    }

    // Calculate metrics for each week
    const metrics: [string, string, number | string][] = [];
    for (const [weekStart, activities] of activitiesByWeeks.entries()) {
      const validRuns = activities.filter(
        (activity) =>
          activity[exerciseTypeIndex] === 'Run' &&
          activity[z2PercentIndex] &&
          activity[paceIndex]
      );

      if (validRuns.length === 0) continue;

      const totalZ2Percent = validRuns.reduce((sum, activity) => sum + parseFloat(activity[z2PercentIndex]), 0);
      const weeklyZ2Average = (totalZ2Percent / validRuns.length).toFixed(0); 

      const totalPaceInSeconds = validRuns.reduce((sum, activity) => sum + parsePace(activity[paceIndex]), 0);
      const averagePaceInSeconds = totalPaceInSeconds / validRuns.length;
      const weeklyPace = secondsToHHMMSS(averagePaceInSeconds);

      metrics.push([weekStart, 'weekly_z2_average', weeklyZ2Average]);
      metrics.push([weekStart, 'weekly_pace', weeklyPace]);
    }

    // Clear the ProgressMetrics tab
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'ProgressMetrics',
    });

    // Write metrics to the ProgressMetrics tab
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'ProgressMetrics',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Week Start', 'Metric Type', 'Value'], ...metrics],
      },
    });

    console.log('ProgressMetrics sheet updated successfully.');
    return res.status(200).json({ message: 'Weekly metrics recalculated and updated.' });
  } catch (error) {
    console.error('Error recalculating weekly metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
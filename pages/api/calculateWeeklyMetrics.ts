// pages/api/calculateWeeklyMetrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '../../src/config';

function parsePace(pace: string): number {
  const [hours, minutes, seconds] = pace.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function getMondayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday adjustment

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date: targetDate } = req.body;
  if (!targetDate || typeof targetDate !== 'string') {
    return res.status(400).json({ error: 'Invalid target date provided' });
  }

  const runDate = new Date(targetDate);
  if (isNaN(runDate.getTime())) {
    return res.status(400).json({ error: `Invalid date format: ${targetDate}` });
  }

  const weekStart = getMondayOfWeek(runDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartFormatted = weekStart.toISOString().split('T')[0];
  const weekEndFormatted = weekEnd.toISOString().split('T')[0];

  try {
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseURL}/api/activityLog?startDate=${weekStartFormatted}&endDate=${weekEndFormatted}`
    );
    const activities = await response.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      console.log('No activities found for the given date range.');
      return res.status(200).json({ message: 'No activities found for the week.' });
    }

    const validRuns = activities.filter(
      (activity) => activity.exercise_type === 'Run' && activity.z2_percent && activity.pace
    );

    if (validRuns.length === 0) {
      console.log('No valid runs found for metrics calculation.');
      return res.status(200).json({ message: 'No valid runs for the week.' });
    }

    const totalZ2Percent = validRuns.reduce((sum, activity) => sum + activity.z2_percent, 0);
    const weeklyZ2Average = totalZ2Percent / validRuns.length;

    const totalPaceInSeconds = validRuns.reduce((sum, activity) => sum + parsePace(activity.pace), 0);
    const averagePaceInSeconds = totalPaceInSeconds / validRuns.length;
    const weeklyPace = new Date(averagePaceInSeconds * 1000).toISOString().substr(11, 8);

    console.log('Calculated Weekly Metrics:', { weeklyZ2Average, weeklyPace });

    // Set up Google Sheets API client
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      undefined,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'ProgressMetrics',
    });

    const rows = existingData.data.values || [];
    const existingRowIndex = rows.findIndex(row => row[0] === weekStartFormatted);

    const newValues = [
      [weekStartFormatted, 'weekly_z2_average', weeklyZ2Average.toFixed(1)],
      [weekStartFormatted, 'weekly_pace', weeklyPace],
    ];

    if (existingRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `ProgressMetrics!A${existingRowIndex + 1}:C${existingRowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newValues },
      });
      console.log('ProgressMetrics sheet updated successfully.');
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: 'ProgressMetrics',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newValues },
      });
      console.log('ProgressMetrics sheet appended successfully.');
    }

    return res.status(200).json({ message: 'Weekly metrics calculated and updated.' });
  } catch (error) {
    console.error('Error calculating weekly metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
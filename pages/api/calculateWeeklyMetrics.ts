// pages/api/calculateWeeklyMetrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '@/src/config';

const SHEET_NAME_PROGRESS_METRICS = 'ProgressMetrics';

function parsePace(pace: string): number {
    const [hours, minutes, seconds] = pace.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

function getMondayOfWeek(date: Date): Date {
    const dayOfWeek = date.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Adjust so Monday is the start of the week

    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    return monday;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { date: targetDate } = req.body;
    if (!targetDate || typeof targetDate !== "string") {
        return res.status(400).json({ error: "Invalid target date provided" });
    }

    const runDate = new Date(targetDate);
    if (isNaN(runDate.getTime())) {
        return res.status(400).json({ error: `Invalid date format: ${targetDate}` });
    }

    // Calculate the start and end of the week (Monday to Sunday)
    const weekStart = getMondayOfWeek(runDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday of the same week

    const weekStartFormatted = weekStart.toISOString().split('T')[0];
    const weekEndFormatted = weekEnd.toISOString().split('T')[0];

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/activityLog`);
    const activityLogs = await response.json();

    const validRuns = activityLogs.filter(
        log => log.date >= weekStartFormatted &&
               log.date <= weekEndFormatted &&
               log.exercise_type === "Run" && log.z2_percent !== undefined && log.pace
    );

    if (validRuns.length === 0) {
        return res.status(200).json({ message: 'No valid runs in the specified week.' });
    }

    const totalZ2Percent = validRuns.reduce((sum, log) => sum + parseFloat(log.z2_percent), 0);
    const weeklyZ2Average = parseFloat((totalZ2Percent / validRuns.length).toFixed(1));

    const totalPaceInSeconds = validRuns.reduce((sum, log) => {
        const paceInSeconds = parsePace(log.pace);
        return isNaN(paceInSeconds) ? sum : sum + paceInSeconds;
    }, 0);

    const averagePaceInSeconds = totalPaceInSeconds / validRuns.length;
    const hours = Math.floor(averagePaceInSeconds / 3600);
    const minutes = Math.floor((averagePaceInSeconds % 3600) / 60);
    const seconds = Math.floor(averagePaceInSeconds % 60);
    const weeklyPace = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const auth = new google.auth.JWT(
        GOOGLE_CLIENT_EMAIL,
        undefined,
        GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: SHEET_NAME_PROGRESS_METRICS,
    });

    const rows = existingData.data.values || [];
    const existingRowIndex = rows.findIndex(row => row[0] === weekStartFormatted);

    const newValues = [
        [weekStartFormatted, 'weekly_z2_average', weeklyZ2Average],
        [weekStartFormatted, 'weekly_pace', weeklyPace],
    ];

    if (existingRowIndex !== -1) {
        // Update existing row for weekly averages
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: `${SHEET_NAME_PROGRESS_METRICS}!A${existingRowIndex + 1}:C${existingRowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: newValues },
        });
    } else {
        // Append new row if no entry exists for the week
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: SHEET_NAME_PROGRESS_METRICS,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: newValues },
        });
    }

    return res.status(200).json({ message: 'Weekly metrics calculated and updated.' });
}
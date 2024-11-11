// src/calculateWeeklyMetrics.ts

import { format, startOfWeek, endOfWeek } from 'date-fns';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '@/src/config';

const SHEET_NAME_PROGRESS_METRICS = 'ProgressMetrics';

function parsePace(pace: string): number {
    const [hours, minutes, seconds] = pace.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

export default async function calculateWeeklyMetrics() {
    const currentDate = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');
    const weekEndFormatted = format(weekEnd, 'yyyy-MM-dd');
    //!!! THIS SEEMS TO WORK ONLY WHEN THE LOGGED RUN IS IN THE CURRENT WEEK. IF I LOG A RUN FOR NEXT OR LAST WEEK THIS WON'T WORK !!!

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/activityLog`);
    const activityLogs = await response.json();

    // Filter runs for those within the current week, with valid pace and Zone 2 values
    const validRuns = activityLogs.filter(
        log => log.date >= weekStartFormatted && log.date <= weekEndFormatted &&
               log.exercise_type === "Run" && log.z2_percent !== undefined && log.pace
    );

    if (validRuns.length === 0) {
        return;
    }

    const totalZ2Percent = validRuns.reduce((sum, log) => sum + parseFloat(log.z2_percent), 0);
    const weeklyZ2Average = parseFloat((totalZ2Percent / validRuns.length).toFixed(1)); // Round to 1 decimal place

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

    // Check for existing data for the week
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
        // Overwrite existing data
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: `${SHEET_NAME_PROGRESS_METRICS}!A${existingRowIndex + 1}:C${existingRowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: newValues,
            },
        });
    } else {
        // Append new data
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: SHEET_NAME_PROGRESS_METRICS,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: newValues,
            },
        });
    }
}
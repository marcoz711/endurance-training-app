// pages/api/calculateWeeklyMetrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { parse, startOfWeek, format } from 'date-fns';

// Function to convert pace to total seconds
function parsePace(pace: string): number | null {
    if (typeof pace !== 'string' || pace.toUpperCase() === "N/A") return null;
    const parts = pace.split(":").map(Number);
    
    if (parts.length === 3) { // HH:MM:SS format (remove leading 00)
        return parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS or M:SS format
        return parts[0] * 60 + parts[1];
    }
    return null; // Unexpected format
}

// Function to convert seconds to MM:SS format
function secondsToMMSS(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get the Monday of the week for a given date
function getMondayOfWeek(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 1 }); // Ensure Monday as the start
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

        // Fetch all activity logs
        const activityData = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'ActivityLog',
        });
        const activityRows = activityData.data.values || [];
        const headers = activityRows.shift();
        if (!headers) return res.status(400).json({ error: 'No activity logs found in the sheet.' });

        const dateIndex = headers.indexOf('date');
        const z2PercentIndex = headers.indexOf('z2_percent');
        const paceIndex = headers.indexOf('pace');
        const exerciseTypeIndex = headers.indexOf('exercise_type');

        // Filter for running activities and prepare processed data
        const runningActivities = activityRows.filter(row => row[exerciseTypeIndex]?.toLowerCase().includes('run'));
        const weeklyData = new Map<string, { totalZ2: number; countZ2: number; totalPace: number; countPace: number }>();

        for (const row of runningActivities) {
            const activityDate = parse(row[dateIndex], 'yyyy-MM-dd', new Date());
            const weekStart = format(getMondayOfWeek(activityDate), 'yyyy-MM-dd'); // Ensures correct Monday date

            const paceInSeconds = parsePace(row[paceIndex]);
            const z2Percent = row[z2PercentIndex]?.toUpperCase() === "N/A" ? null : parseFloat(row[z2PercentIndex]);

            if (!weeklyData.has(weekStart)) {
                weeklyData.set(weekStart, { totalZ2: 0, countZ2: 0, totalPace: 0, countPace: 0 });
            }
            const weekEntry = weeklyData.get(weekStart)!;

            if (z2Percent !== null && !isNaN(z2Percent)) {
                weekEntry.totalZ2 += z2Percent;
                weekEntry.countZ2++;
            }

            if (paceInSeconds !== null) {
                weekEntry.totalPace += paceInSeconds;
                weekEntry.countPace++;
            }
        }

        // Compute final metrics
        const metrics: [string, string, number | string][] = [];
        for (const [weekStart, data] of weeklyData.entries()) {
            const weeklyZ2Average = data.countZ2 > 0 ? (data.totalZ2 / data.countZ2).toFixed(0) : "N/A";
            const weeklyPace = data.countPace > 0 ? secondsToMMSS(data.totalPace / data.countPace) : "N/A";

            metrics.push([weekStart, 'weekly_z2_average', weeklyZ2Average]);
            metrics.push([weekStart, 'weekly_pace', weeklyPace]);
        }

        // Clear the ProgressMetrics tab
        await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'ProgressMetrics',
        });

        // Write new metrics to ProgressMetrics
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'ProgressMetrics',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['Week Start', 'Metric Type', 'Value'], ...metrics] },
        });

        console.log('ProgressMetrics sheet updated successfully.');
        return res.status(200).json({ message: 'Weekly metrics recalculated and updated.' });
    } catch (error) {
        console.error('Error recalculating weekly metrics:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
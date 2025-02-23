import { google } from 'googleapis';
import { ActivityLogEntry, TrainingPlanEntry } from '../types/activity';

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  
  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  private auth;
  private sheets;
  private spreadsheetId: string;

  constructor() {
    this.auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  async getActivityLog(): Promise<ActivityLogEntry[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'ActivityLog',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const entry: any = {};
      headers.forEach((header: string, index: number) => {
        entry[header] = row[index];
      });
      return entry;
    });
  }

  async updateActivityLog(activities: ActivityLogEntry[]): Promise<void> {
    console.log('GoogleSheetsService: First activity to be written:', {
      activity: activities[0],
      hasItemId: Boolean(activities[0]?.itemId),
      itemIdValue: activities[0]?.itemId
    });

    const values = activities.map(activity => {
      const row = [
        activity.date,
        activity.timestamp,
        activity.exercise_type,
        activity.duration,
        activity.distance,
        activity.avg_hr,
        activity.max_hr,
        activity.z2_percent,
        activity.above_z2_percent,
        activity.below_z2_percent,
        activity.mafZonePercent,
        activity.pace,
        activity.notes,
        activity.isIncomplete,
        activity.itemId,
        activity.source
      ];

      console.log('Row to be written:', {
        date: activity.date,
        itemId: activity.itemId,
        rowLength: row.length
      });

      return row;
    });

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'ActivityLog',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async getMostRecentActivity(): Promise<ActivityLogEntry | null> {
    const activities = await this.getActivityLog();
    return activities.length > 0 ? activities[activities.length - 1] : null;
  }

  async getSheetValues({ spreadsheetId, range }: { spreadsheetId: string, range: string }) {
    return await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
  }

  async updateActivityLogEntry(date: string, timestamp: string, updates: Partial<ActivityLogEntry>): Promise<void> {
    // Get all activities
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'ActivityLog',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No activities found');
    }

    // Find the row to update
    const headers = rows[0];
    const dateIndex = headers.indexOf('date');
    const timestampIndex = headers.indexOf('timestamp');
    const rowIndex = rows.findIndex((row) =>
      row[dateIndex] === date && row[timestampIndex] === timestamp
    );

    if (rowIndex === -1) {
      throw new Error('Activity not found');
    }

    // Update the specific fields
    const row = rows[rowIndex];
    if (updates.exercise_type) {
      row[headers.indexOf('exercise_type')] = updates.exercise_type;
    }
    if (updates.notes !== undefined) {
      row[headers.indexOf('notes')] = updates.notes;
    }

    // Update the sheet
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `ActivityLog!A${rowIndex + 1}:${String.fromCharCode(65 + headers.length)}${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }
} 
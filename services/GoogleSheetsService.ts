import { google } from 'googleapis';

export class GoogleSheetsService {
  private sheets;

  constructor() {
    try {
      if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error("Missing Google Sheets credentials in environment variables");
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error("Failed to initialize GoogleSheetsService:", error);
      throw new Error(`GoogleSheets initialization failed: ${error.message}`);
    }
  }

  public async getSheetValues({ spreadsheetId, range }: { spreadsheetId: string, range: string }) {
    if (!spreadsheetId || !range) {
      throw new Error("Missing required parameters for getSheetValues");
    }

    try {
      return await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
    } catch (error) {
      console.error("getSheetValues error:", error);
      throw new Error(`Failed to get sheet values: ${error.message}`);
    }
  }

  async getMostRecentActivity() {
    const response = await this.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'ActivityLog!A2:B'
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    const lastRow = rows[rows.length - 1];
    return {
      date: lastRow[0],
      timestamp: lastRow[1]
    };
  }

  async updateActivityLog(activities: any[]) {
    return await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'ActivityLog!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: activities.map((activity) => [
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
          activity.pace,
          '',
          activity.notes || '',
          activity.isIncomplete,
          activity.itemId,
          activity.source,
        ]),
      },
    });
  }

  // ... existing methods ...
} 
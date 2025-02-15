export class GoogleSheetsService {
  private sheets;

  constructor(auth: any) {
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getSheetValues({ spreadsheetId, range }: { spreadsheetId: string, range: string }) {
    return await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
  }

  // ... existing methods ...
} 
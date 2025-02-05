import { google } from "googleapis";

const SHEET_NAME = "FitnessSyncerDataSources";

export async function saveDataSources(dataSources: Array<{ id: string; name: string }>): Promise<void> {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const values = dataSources.map((source) => [source.id, source.name]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:B`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["ID", "Name"], ...values],
    },
  });
}
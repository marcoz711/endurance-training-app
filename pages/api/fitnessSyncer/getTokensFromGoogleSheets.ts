import { google } from "googleapis";
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "@/src/config";

export async function getTokensFromGoogleSheets() {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  console.log("Fetching tokens from Google Sheets...");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: "Config!B2:C2", // Access Token in B2, Refresh Token in C2
  });

  const values = response.data.values || [];
  const [accessToken, refreshToken] = values[0] || [];

  console.log("Tokens fetched from Google Sheets:", { accessToken, refreshToken });

  return { accessToken, refreshToken };
}

export async function saveTokenToGoogleSheets(accessToken: string, refreshToken: string) {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  console.log("Saving tokens to Google Sheets:", { accessToken, refreshToken });

  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: "Config!B2:C2",
    valueInputOption: "RAW",
    requestBody: {
      values: [[accessToken, refreshToken]],
    },
  });

  console.log("Tokens saved to Google Sheets successfully.");
}
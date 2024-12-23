import { google } from "googleapis";

export async function saveTokenToGoogleSheets(accessToken: string, refreshToken: string) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL, // Your Google Service Account email
    undefined,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Your Google Service Account private key
    ["https://www.googleapis.com/auth/spreadsheets"] // Scope for Google Sheets API
  );

  const sheets = google.sheets({ version: "v4", auth });

  console.log("Saving tokens to Google Sheets...");

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID, // Your Google Sheets ID
      range: "Config!B2:C2", // Cell range to save the tokens (update this range as needed)
      valueInputOption: "RAW",
      requestBody: {
        values: [[accessToken, refreshToken]], // Save the tokens
      },
    });

    console.log("Tokens saved successfully.");
  } catch (error: any) {
    console.error("Error saving tokens to Google Sheets:", error.message);
    throw new Error("Failed to save tokens to Google Sheets.");
  }
}
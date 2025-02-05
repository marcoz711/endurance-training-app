import axios from "axios";
import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import qs from "querystring";

const CONFIG_SHEET_NAME = "Config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    console.error("Invalid request method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Initializing Google Sheets authentication...");
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    console.log("Google Sheets client initialized.");
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    console.log("Fetching Authorization Code from Config sheet...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CONFIG_SHEET_NAME}!A1:B1`,
    });

    const values = response.data.values;
    if (!values || values.length === 0 || values[0][0] !== "Authorization Code" || !values[0][1]) {
      console.error("Authorization Code not found in Config sheet.");
      return res.status(400).json({ error: "Authorization Code not found in Config sheet." });
    }

    const authCode = values[0][1];
    console.log("Fetched Authorization Code:", authCode);

    // Prepare payload for token exchange
    const payload = qs.stringify({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: process.env.FITNESSSYNCER_REDIRECT_URI,
      client_id: process.env.FITNESSSYNCER_CLIENT_ID,
      client_secret: process.env.FITNESSSYNCER_CLIENT_SECRET,
    });

    console.log("Requesting tokens from FitnessSyncer...");
    const tokenResponse = await axios.post("https://api.fitnesssyncer.com/api/oauth/access_token", payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("Tokens received from FitnessSyncer:", tokenResponse.data);

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expires_in;

    console.log("Storing tokens in Config sheet...");
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CONFIG_SHEET_NAME}!A2:B4`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["Access Token", access_token],
          ["Refresh Token", refresh_token],
          ["Expiry Time", expiryTimestamp.toString()],
        ],
      },
    });

    console.log("Tokens successfully stored in Config sheet.");
    res.status(200).json({ success: true, access_token, refresh_token, expires_in });
  } catch (error) {
    if (error.response) {
      console.error("Error response from FitnessSyncer API:", error.response.data);
    } else {
      console.error("Error details:", error.message);
    }
    res.status(500).json({ error: "Failed to fetch and store tokens." });
  }
}
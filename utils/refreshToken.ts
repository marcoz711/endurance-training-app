import axios from "axios";
import { google } from "googleapis";
import qs from "querystring";

const CONFIG_SHEET_NAME = "Config";
const LOG_SHEET_NAME = "TokenRefreshLog";

export async function getValidAccessToken(retryCount = 0): Promise<string> {
  const MAX_RETRIES = 2;
  console.log(`Attempt ${retryCount + 1} to get valid access token...`);

  try {
    // Set up Google Sheets API client
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    // Get tokens from Config sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: CONFIG_SHEET_NAME,
    });

    const tokens = response.data.values?.find(row => row[0] === "fitnesssyncer_tokens");
    if (!tokens) throw new Error("No tokens found in Config sheet");

    let accessToken = tokens[1];
    const refreshToken = tokens[2];
    const tokenExpiry = new Date(tokens[3]);
    
    // Convert current time to UTC for consistent comparison
    const now = new Date();
    const utcNow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ));

    // Add buffer time (5 minutes) to current time
    const bufferTime = new Date(utcNow.getTime() + 5 * 60 * 1000);

    if (tokenExpiry < bufferTime) {
      console.log("Access Token expired or expiring soon. Refreshing...");
      try {
        const refreshResponse = await axios.post("https://api.fitnesssyncer.com/api/auth/token", {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.FITNESSSYNCER_CLIENT_ID,
          client_secret: process.env.FITNESSSYNCER_CLIENT_SECRET,
        });

        // Calculate new expiry time in UTC
        const expiresIn = refreshResponse.data.expires_in;
        const newExpiry = new Date(utcNow.getTime() + expiresIn * 1000);

        // Update tokens in Config sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          range: `${CONFIG_SHEET_NAME}!A2:B4`,
          valueInputOption: "RAW",
          requestBody: {
            values: [
              ["Access Token", refreshResponse.data.access_token],
              ["Refresh Token", refreshToken],
              ["Expiry Time", newExpiry.toISOString()],
            ],
          },
        });

        accessToken = refreshResponse.data.access_token;
      } catch (error) {
        console.error("Refresh token error details:", {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data
          }
        });
        throw error;
      }
    }

    return accessToken;
  } catch (error) {
    if (retryCount < MAX_RETRIES - 1) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      return getValidAccessToken(retryCount + 1);
    }
    console.error("Detailed API Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}
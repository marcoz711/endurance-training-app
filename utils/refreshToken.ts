import axios from "axios";
import { google } from "googleapis";

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
    console.log('Fetching tokens from Config sheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: CONFIG_SHEET_NAME,
    });

    console.log('Config sheet response:', {
      hasValues: !!response.data.values,
      rowCount: response.data.values?.length,
    });

    if (!response.data.values) {
      throw new Error('No data found in Config sheet');
    }

    // Create a map of the config values
    const configMap = new Map(
      response.data.values.map(row => [row[0], row[1]])
    );

    const accessToken = configMap.get('Access Token');
    const refreshToken = configMap.get('Refresh Token');
    const expiryTime = configMap.get('Expiry Time');

    if (!accessToken || !refreshToken || !expiryTime) {
      console.error('Missing required tokens. Available config:', Object.fromEntries(configMap));
      throw new Error('Missing required tokens in Config sheet');
    }

    const tokenExpiry = new Date(parseInt(expiryTime) * 1000); // Convert UNIX timestamp to Date
    
    console.log('Found tokens:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      tokenExpiry: tokenExpiry.toISOString()
    });

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
          range: 'Config!B2:B4', // Update Access Token and Expiry Time
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [refreshResponse.data.access_token],
              [refreshToken],
              [Math.floor(newExpiry.getTime() / 1000).toString()]
            ]
          }
        });

        return refreshResponse.data.access_token;
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
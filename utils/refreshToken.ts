import axios from "axios";
import { google } from "googleapis";
import qs from "querystring";

const CONFIG_SHEET_NAME = "Config";
const LOG_SHEET_NAME = "TokenRefreshLog";

export async function getValidAccessToken(): Promise<string> {
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} to get valid access token...`);
      
      const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        undefined,
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets"]
      );

      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${CONFIG_SHEET_NAME}!A2:B4`,
      });

      const tokens = response.data.values || [];
      const refreshToken = tokens.find((row) => row[0] === "Refresh Token")?.[1];
      let accessToken = tokens.find((row) => row[0] === "Access Token")?.[1];
      const expiryTime = tokens.find((row) => row[0] === "Expiry Time")?.[1];
      const currentTime = Math.floor(Date.now() / 1000);

      if (!refreshToken) {
        throw new Error("Refresh Token not found in Config sheet.");
      }

      // If token is expired or will expire in next 60 seconds, refresh it
      if (!expiryTime || currentTime > parseInt(expiryTime) - 60) {
        console.log("Access Token expired or expiring soon. Refreshing...");
        const payload = qs.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.FITNESSSYNCER_CLIENT_ID,
          client_secret: process.env.FITNESSSYNCER_CLIENT_SECRET,
          redirect_uri: process.env.FITNESSSYNCER_REDIRECT_URI,
        });

        const tokenResponse = await axios.post(
          "https://api.fitnesssyncer.com/api/oauth/access_token",
          payload,
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        const { access_token, refresh_token: newRefreshToken, expires_in } = tokenResponse.data;
        const newExpiryTime = Math.floor(Date.now() / 1000) + expires_in;

        if (!access_token) {
          throw new Error("API did not return a valid access token.");
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${CONFIG_SHEET_NAME}!A2:B4`,
          valueInputOption: "RAW",
          requestBody: {
            values: [
              ["Access Token", access_token],
              ["Refresh Token", newRefreshToken || refreshToken],
              ["Expiry Time", newExpiryTime.toString()],
            ],
          },
        });

        return access_token;
      }

      if (!accessToken) {
        throw new Error("Access Token is missing despite being valid.");
      }

      return accessToken;

    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      console.error('Refresh token error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config
      });
      if (retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to get valid access token after all retry attempts");
}
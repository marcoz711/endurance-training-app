import axios from "axios";
import { google } from "googleapis";
import qs from "querystring";

const CONFIG_SHEET_NAME = "Config";
const LOG_SHEET_NAME = "TokenRefreshLog";

export async function getValidAccessToken(): Promise<string> {
try {
  console.log("Initializing Google Sheets authentication...");
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  console.log("Fetching tokens from Config sheet...");
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
    console.error("Refresh Token not found in Config sheet.");
    throw new Error("Refresh Token is missing.");
  }

  if (currentTime < parseInt(expiryTime || "0")) {
    console.log("Access Token is still valid. Returning existing token.");
    if (!accessToken) {
      throw new Error("Access Token is missing despite being valid.");
    }
    return accessToken;
  }

  console.log("Access Token expired. Refreshing...");
  const payload = qs.stringify({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.FITNESSSYNCER_CLIENT_ID,
    client_secret: process.env.FITNESSSYNCER_CLIENT_SECRET,
    redirect_uri: process.env.FITNESSSYNCER_REDIRECT_URI,
  });

  console.log("Payload for token refresh:", payload);

  const tokenResponse = await axios.post(
    "https://api.fitnesssyncer.com/api/oauth/access_token",
    payload,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  console.log("Received response from token refresh API:", tokenResponse.data);

  const { access_token, refresh_token: newRefreshToken, expires_in } = tokenResponse.data;
  const newExpiryTime = Math.floor(Date.now() / 1000) + expires_in;

  if (!access_token) {
    throw new Error("API did not return a valid access token.");
  }

  console.log("Storing refreshed tokens in Config sheet...");
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

  // Update local variable with the new access token
  accessToken = access_token;

  // Log the full API response for history
  console.log("Logging token refresh response...");
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${LOG_SHEET_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          new Date().toISOString(), // Timestamp
          JSON.stringify(tokenResponse.data), // Full API response
        ],
      ],
    },
  });

  console.log("Tokens successfully refreshed and logged.");
  return accessToken;
} catch (error: any) {
  if (error.response) {
    console.error("FitnessSyncer Token Refresh Error Response:", error.response.data || error.response);
  } else {
    console.error("FitnessSyncer Token Refresh Error:", error.message);
  }
  // Only throw an error if the final access token is not valid
  throw new Error("Failed to retrieve a valid access token.");
}
}
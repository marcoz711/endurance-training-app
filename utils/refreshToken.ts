import axios from "axios";
import { google } from "googleapis";
import { GoogleSheetsService } from '../services/googleSheets';

const CONFIG_SHEET_NAME = "Config";
const LOG_SHEET_NAME = "TokenRefreshLog";

export async function getValidAccessToken(retryCount = 0): Promise<string> {
  const MAX_RETRIES = 2;

  try {
    const service = new GoogleSheetsService();

    // Get tokens from Config sheet
    const response = await service.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Config',
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

    // Add validation for refresh token format
    if (!refreshToken || refreshToken.length < 10) {  // Adjust length check based on expected token length
      console.error('Invalid refresh token format:', {
        tokenLength: refreshToken?.length,
        tokenPreview: refreshToken ? `${refreshToken.substring(0, 5)}...` : 'null'
      });
      throw new Error('Invalid refresh token format');
    }

    const tokenExpiry = new Date(parseInt(expiryTime) * 1000); // Convert UNIX timestamp to Date
    
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
      try {
        // Log the request data for debugging
        console.log('Attempting token refresh with data:', {
          refresh_token: refreshToken?.substring(0, 5) + '...',
          client_id: process.env.FITNESSSYNCER_CLIENT_ID,
          client_secret_length: process.env.FITNESSSYNCER_CLIENT_SECRET?.length,
          redirect_uri: process.env.FITNESSSYNCER_REDIRECT_URI
        });

        const formData = new URLSearchParams();
        formData.append('grant_type', 'refresh_token');
        formData.append('refresh_token', refreshToken);
        formData.append('client_id', process.env.FITNESSSYNCER_CLIENT_ID || '');
        formData.append('client_secret', process.env.FITNESSSYNCER_CLIENT_SECRET || '');
        formData.append('redirect_uri', process.env.FITNESSSYNCER_REDIRECT_URI || '');

        const refreshResponse = await axios.post(
          "https://api.fitnesssyncer.com/api/oauth/access_token",
          formData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        // Calculate new expiry time in UTC
        const expiresIn = refreshResponse.data.expires_in;
        const newExpiry = new Date(utcNow.getTime() + expiresIn * 1000);

        // Update tokens in Config sheet
        await service.updateSheetValues({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          range: 'Config!B2:B4', // Update Access Token and Expiry Time
          values: [
            [refreshResponse.data.access_token],
            [refreshToken],
            [Math.floor(newExpiry.getTime() / 1000).toString()]
          ]
        });

        return refreshResponse.data.access_token;
      } catch (error) {
        console.error('Token refresh failed:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
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
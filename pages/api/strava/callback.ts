import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { google } from 'googleapis';
import { GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '@/src/config';

async function storeTokensInGoogleSheets(tokens: { accessToken: string; refreshToken: string; expiresAt: number }) {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: 'Config!A:C', // Adjust the range based on your setup
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['access_token', 'refresh_token', 'expires_at'], // Headers
        [tokens.accessToken, tokens.refreshToken, tokens.expiresAt], // Token data
      ],
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    // Exchange the authorization code for tokens
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at } = response.data;

    // Store tokens in Google Sheets
    await storeTokensInGoogleSheets({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_at,
    });

    res.status(200).json({ message: 'Authorization successful!' });
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to exchange authorization code for tokens' });
  }
}
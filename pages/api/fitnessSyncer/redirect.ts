import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { saveTokenToGoogleSheets } from "./saveTokenToGoogleSheets";

const FITNESS_SYNCER_TOKEN_URL = process.env.FITNESS_SYNCER_TOKEN_URL; // Moved to .env.local
const CLIENT_ID = process.env.FITNESS_SYNCER_API_KEY;
const CLIENT_SECRET = process.env.FITNESS_SYNCER_API_SECRET;
const REDIRECT_URI = process.env.FITNESS_SYNCER_REDIRECT_URI;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Received query parameters:", req.query);

  const { code, state } = req.query;

  if (!code) {
    console.error("Authorization code is missing");
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    console.log("Exchanging authorization code for tokens...");

    const response = await axios.post(
      FITNESS_SYNCER_TOKEN_URL,
      {
        grant_type: "authorization_code",
        code: code as string,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    console.log("Access Token:", access_token);
    console.log("Refresh Token:", refresh_token);

    // Save tokens to Google Sheets
    await saveTokenToGoogleSheets(access_token, refresh_token);

    res.status(200).json({ message: "Tokens saved successfully", access_token, refresh_token });
  } catch (error: any) {
    console.error("Error exchanging authorization code:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to exchange authorization code" });
  }
}
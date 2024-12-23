import type { NextApiRequest, NextApiResponse } from "next";

const FITNESS_SYNCER_BASE_URL = process.env.FITNESS_SYNCER_BASE_URL; // Moved to .env.local
const CLIENT_ID = process.env.FITNESS_SYNCER_API_KEY; // Moved to .env.local
const REDIRECT_URI = process.env.FITNESS_SYNCER_REDIRECT_URI; // Moved to .env.local

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = "state123"; // Replace with a dynamically generated state for security

  if (!CLIENT_ID || !REDIRECT_URI) {
    console.error("Missing CLIENT_ID or REDIRECT_URI");
    return res.status(500).json({ error: "CLIENT_ID or REDIRECT_URI is missing" });
  }

  const authorizationUrl = `${FITNESS_SYNCER_BASE_URL}?client_id=${CLIENT_ID}&response_type=code&scope=Sources&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${state}`;

  console.log("Redirecting to FitnessSyncer Authorization URL:", authorizationUrl);

  res.redirect(authorizationUrl);
}
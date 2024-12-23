import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getTokensFromGoogleSheets } from "./getTokensFromGoogleSheets";

const FITNESS_SYNCER_BASE_URL = "https://www.fitnesssyncer.com/api/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken } = await getTokensFromGoogleSheets();

    const response = await axios.get(`${FITNESS_SYNCER_BASE_URL}/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        per_page: 1, // Fetch the latest activity
        sort: "date,desc",
        filter: "activity_type==Run", // Filter only running activities
      },
    });

    return res.status(200).json({ lastRunData: response.data });
  } catch (error: any) {
    console.error("Error fetching HR data:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to fetch HR data" });
  }
}
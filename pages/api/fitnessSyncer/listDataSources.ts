import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";
import { saveDataSources } from "../../../utils/saveDataSources";

const FITNESS_SYNCER_API_SOURCES_URL = "https://api.fitnesssyncer.com/api/providers/sources/";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const accessToken = await getValidAccessToken(); // Get a valid access token

    console.log("Making API request to FitnessSyncer:");
    console.log(`URL: ${FITNESS_SYNCER_API_SOURCES_URL}`);
    console.log(`Headers: Authorization: Bearer ${accessToken}`);

    // Fetch data sources from the FitnessSyncer API
    const response = await fetch(FITNESS_SYNCER_API_SOURCES_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Response Error: ${response.status}: ${errorText}`);
      throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
    }

    const { items: dataSources } = await response.json();

    console.log("Received API response:", dataSources);

    // Save data sources to Google Sheets
    const formattedDataSources = dataSources.map((source: any) => ({
      id: source.id,
      name: source.name,
    }));
    await saveDataSources(formattedDataSources);

    res.status(200).json({ success: true, dataSources });
  } catch (error: any) {
    console.error("Error fetching FitnessSyncer data sources:", error.message);
    res.status(500).json({ error: error.message });
  }
}
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";

const FITNESS_SYNCER_API_SOURCES_URL = "https://api.fitnesssyncer.com/api/providers/sources/";

interface DataSource {
  date: number;
  filter: object;
  name: string;
  id: string;
  type: string;
  enabled: boolean;
  providerType: string;
  group: string;
}

interface FitnessSyncerResponse {
  items: DataSource[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = await getValidAccessToken();
    const response = await fetch(FITNESS_SYNCER_API_SOURCES_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
    }

    const rawResponse = (await response.json()) as FitnessSyncerResponse;
    console.log("Raw API response:", rawResponse);

    // Access the `items` property of the response
    const dataSources = rawResponse.items || [];
    console.log("Parsed data sources:", dataSources);

    res.status(200).json({ dataSources });
  } catch (error: any) {
    console.error("Error fetching data sources:", error.message);
    res.status(500).json({ error: error.message });
  }
}
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { google } from "googleapis";
import { getValidAccessToken } from "../../../utils/refreshToken";

const SHEET_NAME = "FitnessSyncerDataSources";

async function getDataSourceIdByName(dataSourceName: string): Promise<string | null> {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:B`,
  });

  const rows = response.data.values || [];
  const matchingRow = rows.find((row) => row[1] === dataSourceName);

  return matchingRow ? matchingRow[0] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { dataSourceName, offset = "0", limit = "50" } = req.query;

    if (!dataSourceName) {
      console.error("Missing dataSourceName parameter.");
      return res.status(400).json({ error: "dataSourceName parameter is required" });
    }

    const dataSourceId = await getDataSourceIdByName(dataSourceName as string);

    if (!dataSourceId) {
      console.error(`Data source "${dataSourceName}" not found.`);
      return res.status(404).json({ error: `Data source "${dataSourceName}" not found` });
    }

    const accessToken = await getValidAccessToken(); // Get a valid access token

    // Construct the correct URL with the dataSourceId
    const fitnessSyncerApiItemsUrl = `https://api.fitnesssyncer.com/api/providers/sources/69653ce2-f3b5-4320-88b9-200ce81e79cf/items/`;

    console.log("Making API request to FitnessSyncer:");
    console.log(`URL: ${fitnessSyncerApiItemsUrl}`);
    console.log(`Headers: Authorization: Bearer ${accessToken}`);
    console.log(`Query Parameters: offset=${offset}, limit=${limit}`);

    // Fetch items from the data source
    const response = await fetch(fitnessSyncerApiItemsUrl, {
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

    const items = await response.json();
    console.log("Received API response");
    // console.log("Received API response: ", items);

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error fetching FitnessSyncer data source items:", error.message);
    res.status(500).json({ error: error.message });
  }
}
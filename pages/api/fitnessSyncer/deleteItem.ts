import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { getValidAccessToken } from "../../../utils/refreshToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed. Use DELETE method." });
  }

  const { itemId } = req.query;

  if (!itemId || typeof itemId !== "string") {
    return res.status(400).json({ error: "Invalid or missing itemId parameter." });
  }

  try {
    const dataSourceId = "69653ce2-f3b5-4320-88b9-200ce81e79cf"; // Hardcoded Garmin dataSourceId
    const accessToken = await getValidAccessToken();

    console.log(`Deleting item with ID: ${itemId} from dataSource: ${dataSourceId}`);

    // Call FitnessSyncer API to delete the item
    const response = await fetch(
      `https://api.fitnesssyncer.com/api/providers/sources/${dataSourceId}/items/${itemId}/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FitnessSyncer API responded with ${response.status}: ${errorText}`);
    }

    res.status(200).json({ message: `Item with ID ${itemId} successfully deleted.` });
  } catch (error: any) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({ error: error.message });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';
import { getValidAccessToken as getAccessToken } from '@/utils/refreshToken';
import { GoogleSheetsService } from '@/services/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid activity ID' });
  }

  try {
    const accessToken = await getAccessToken();

    const apiUrl = process.env.FITNESS_SYNCER_API_URL;
    if (!apiUrl) {
      return res.status(500).json({ error: 'FITNESS_SYNCER_API_URL is not defined' });
    }

    const service = new GoogleSheetsService();
    
    const sourceId = await getSourceId(service);
    
    const requestUrl = `${apiUrl}/providers/sources/${sourceId}/items/${id}`;
    console.log(`Fetching FitnessSyncer activity from: ${requestUrl}`);
    console.log(`Authorization: Bearer ${accessToken}`);

    const response = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`FitnessSyncer API error: ${response.statusText}`, errorBody);
      throw new Error(`FitnessSyncer API error: ${response.statusText}`);
    }

    const activityData = await response.json();
    return res.status(200).json(activityData);

  } catch (error) {
    console.error('Error fetching activity details:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch activity details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getSourceId(service: GoogleSheetsService): Promise<string> {
  try {
    const response = await service.getSheetValues({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'FitnessSyncerDataSources!A2:B2',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No source ID found in FitnessSyncerDataSources sheet');
    }

    const sourceId = rows[0][0];
    if (!sourceId) {
      throw new Error('Source ID is empty in FitnessSyncerDataSources sheet');
    }

    return sourceId.trim();
  } catch (error) {
    console.error('Error fetching source ID:', error);
    throw new Error(`Failed to get source ID: ${error.message}`);
  }
} 
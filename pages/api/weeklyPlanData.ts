// pages/api/weeklyPlanData.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { config } from '@/src/config';

const sheets = google.sheets('v4');
const auth = new google.auth.JWT(
  config.client_email,
  undefined,
  config.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await auth.authorize();
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: config.googleSheetId,
      range: 'TrainingPlan!A:D',
    });
    res.status(200).json(response.data.values);
  } catch (error) {
    console.error('Error fetching weekly plan data:', error);
    res.status(500).json({ error: 'Failed to fetch weekly plan data' });
  }
};
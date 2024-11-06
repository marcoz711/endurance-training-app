// src/testFetchTrainingData.ts
import { fetchTodayData, fetchProgressData, fetchWeeklyPlanData } from './googleSheetsApi';
import { google } from 'googleapis';
import { googleSheetId } from './config';

async function deleteSheetByName(sheetName: string) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get the list of sheets
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: googleSheetId,
    });

    const sheet = sheetInfo.data.sheets?.find((s) => s.properties?.title === sheetName);

    if (sheet && sheet.properties?.sheetId) {
      // Delete the sheet if found
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: googleSheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: sheet.properties.sheetId,
              },
            },
          ],
        },
      });
      console.log(`Sheet "${sheetName}" deleted successfully.`);
    } else {
      console.log(`Sheet "${sheetName}" not found.`);
    }
  } catch (error) {
    console.error(`Error deleting sheet "${sheetName}":`, error);
  }
}

async function testFetch() {
  try {
    const todayData = await fetchTodayData();
    console.log('Today Data:', todayData);

    const progressData = await fetchProgressData();
    console.log('Progress Data:', progressData);

    const weeklyPlanData = await fetchWeeklyPlanData();
    console.log('Weekly Plan Data:', weeklyPlanData);

    // Attempt to delete the "IGNORE" sheet
    await deleteSheetByName('IGNORE');
  } catch (error) {
    console.error('Error during test fetch:', error);
  }
}

testFetch();
// testGoogleSheets.ts
import { google } from 'googleapis';

const SHEET_ID = '1QThdVmORil8gFt0mJCQq3bVZxdS9KzWN4OviJG0XTv4'; // Replace with your actual Google Sheet ID
const RANGE = 'training_plans!A1:E16'; // Adjust the range to fit the data you want to test with

async function testGoogleSheets() {
  try {
    // Authenticate with the Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json', // Replace with the path to your JSON key file
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Create a Sheets client
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch data from the Google Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    // Log the fetched data
    const rows = response.data.values;
    if (rows && rows.length) {
      console.log('Fetched data from Google Sheets:', rows);
    } else {
      console.log('No data found in the specified range.');
    }
  } catch (error) {
    console.error('Error connecting to Google Sheets:', error);
  }
}

// Run the test function
testGoogleSheets();
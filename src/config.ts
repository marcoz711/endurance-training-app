// src/config.ts
export const config = {
    googleSheetId: process.env.GOOGLE_SHEET_ID || '',
    client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  };  
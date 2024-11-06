// src/types.ts

// Define the Activity type based on the structure of your Google Sheets data
export interface Activity {
    date: string;          // e.g., "2024-07-15"
    activity: string;      // e.g., "Zone 2 Run"
    duration: string;      // e.g., "45 min"
    notes?: string;        // e.g., "Easy pace, focus on breathing" (optional)
  }  
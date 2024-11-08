// pages/api/recentActivities.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return placeholder recent activities data
  res.status(200).json([
    {
      type: 'run',
      duration: 30,
      notes: 'Morning run',
      date: '2024-11-07',
      z2percent: 80,
      pace: '7:30/km'
    },
    {
      type: 'strength',
      duration: 45,
      notes: 'Upper body strength',
      date: '2024-11-06'
    }
  ]);
}
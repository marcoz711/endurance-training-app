// /pages/api/whoop/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Utility function to verify the request signature
function verifySignature(req: NextApiRequest, secret: string): boolean {
    const signature = req.headers['x-whoop-signature'] as string;
    const timestamp = req.headers['x-whoop-signature-timestamp'] as string;
    if (!signature || !timestamp) return false;

    const payload = timestamp + JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', secret)
                       .update(payload)
                       .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET as string;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Verify the signature to ensure the request is from Whoop
    if (!verifySignature(req, WHOOP_CLIENT_SECRET)) {
        return res.status(403).json({ error: 'Invalid signature' });
    }

    try {
        const { event_type, activity_id, user_id, timestamp } = req.body;

        // Log or process the data as required
        console.log('Webhook received:', { event_type, activity_id, user_id, timestamp });

        // Respond with a 200 status to acknowledge receipt
        res.status(200).json({ message: 'Webhook received successfully' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
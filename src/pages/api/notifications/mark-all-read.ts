// pages/api/notifications/mark-all-read.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });
    if (req.method === 'PATCH') {
      const notifications = db.collection('notifications');
      await notifications.updateMany({ userId: session.userId }, { $set: { read: true } });
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

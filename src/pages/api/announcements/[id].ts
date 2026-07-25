// pages/api/announcements/[id].ts — PUT/PATCH/DELETE single announcement
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    const annId = req.query.id as string;
    const announcements = db.collection('announcements');

    const ann = await announcements.findOne({ id: annId });
    if (!ann) return res.status(404).json({ detail: 'Announcement not found' });

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!session || !['admin', 'super_admin'].includes(session.role)) return res.status(403).json({ detail: 'Admin only' });
      await announcements.updateOne({ id: annId }, { $set: req.body });
      const updated = await announcements.findOne({ id: annId });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    if (req.method === 'DELETE') {
      if (!session || !['admin', 'super_admin'].includes(session.role)) return res.status(403).json({ detail: 'Admin only' });
      await announcements.deleteOne({ id: annId });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

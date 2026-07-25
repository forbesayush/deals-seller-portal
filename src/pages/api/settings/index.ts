// pages/api/settings/index.ts — GET settings
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    if (req.method === 'GET') {
      const sysSettings = db.collection('system_settings');
      const list = await sysSettings.find({}).toArray();
      const obj: any = {};
      list.forEach(s => { obj[s.key] = s.value; });
      return res.status(200).json(obj);
    }
    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

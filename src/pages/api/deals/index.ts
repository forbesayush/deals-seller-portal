// pages/api/deals/index.ts — GET all deals, POST new deal
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    const deals = db.collection('deals');

    if (req.method === 'GET') {
      const activeOnly = req.query.active_only === 'true' || session?.role === 'buyer';
      const query: any = {};
      if (activeOnly) {
        query.active = true;
        // Filter to only deals with remaining slots
        // We can't do computed fields in MongoDB easily, so we pull all active and filter
        const all = await deals.find({ active: true }).toArray();
        const available = all.filter(d => ((d.slots || 0) - (d.claimedCount || 0)) > 0);
        return res.status(200).json(available.map(({ _id, ...d }) => d));
      }
      const all = await deals.find({}).toArray();
      return res.status(200).json(all.map(({ _id, ...d }) => d));
    }

    if (req.method === 'POST') {
      if (!session || !['admin', 'super_admin', 'manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin access required' });
      }
      const id = genId('DEA');
      const newDeal = { id, active: true, claimedCount: 0, createdAt: nowISO(), ...req.body };
      await deals.insertOne(newDeal);
      const { _id, ...clean } = newDeal as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

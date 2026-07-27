// pages/api/deals/index.ts — GET all deals, POST new deal (Optimized with MongoDB & In-Memory TTL Cache)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    const deals = db.collection('deals');

    if (req.method === 'GET') {
      const activeOnly = req.query.active_only === 'true' || session?.role === 'buyer';
      const cacheKey = `deals_list_${activeOnly ? 'active' : 'all'}_${req.query.q || ''}_${req.query.platform || ''}`;
      
      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
        return res.status(200).json(cached);
      }

      if (activeOnly) {
        const all = await deals.find({ active: true }).toArray();
        const available = all.filter(d => ((d.slots || 0) - (d.claimedCount || 0)) > 0);
        const result = available.map(({ _id, ...d }) => d);
        setCached(cacheKey, result, 10); // 10s TTL Cache
        res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
        return res.status(200).json(result);
      }

      const all = await deals.find({}).toArray();
      const result = all.map(({ _id, ...d }) => d);
      setCached(cacheKey, result, 10);
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      if (!session || !['admin', 'super_admin', 'manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin access required' });
      }
      const id = genId('DEA');
      const newDeal = { id, active: true, claimedCount: 0, createdAt: nowISO(), ...req.body };
      await deals.insertOne(newDeal);

      invalidateCache('deals_list'); // Invalidate cache on new deal creation

      const { _id, ...clean } = newDeal as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

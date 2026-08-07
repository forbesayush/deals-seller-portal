import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';
import { syncAddDeal } from '@/lib/syncEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    const deals = db.collection('deals');
    const tombstones = db.collection('deleted_tombstones');

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const activeOnly = req.query.active_only === 'true' || session?.role === 'buyer';
      // Fetch tombstones first to incorporate version into cache key
      const tombstoneDocs = await tombstones.find({}).toArray();
      const tombstoneVersion = tombstoneDocs.length;
      const cacheKey = `deals_list_${session?.role || 'guest'}_${activeOnly ? 'active' : 'all'}_${req.query.q || ''}_${req.query.platform || ''}_v${tombstoneVersion}`;

      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      const deletedSet = new Set(tombstoneDocs.map(t => String(t.targetId).toLowerCase()));

      let allDocs = activeOnly
        ? await deals.find({ active: true }).toArray()
        : await deals.find({}).toArray();

      let cleanDeals = allDocs.filter(d => 
        !deletedSet.has(String(d.id).toLowerCase()) &&
        !deletedSet.has(String(d.productCode || '').toLowerCase()) &&
        !deletedSet.has(String(d.productName || '').toLowerCase())
      );

      if (activeOnly) {
        cleanDeals = cleanDeals.filter(d => ((d.slots || 0) - (d.claimedCount || 0)) > 0);
      }

      const result = cleanDeals.map(({ _id, ...d }) => d);
      setCached(cacheKey, result, 5);
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      if (!session || !['admin', 'super_admin', 'manager', 'product_manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin access required' });
      }

      const cleanNewDeal = await syncAddDeal({
        db,
        dealData: req.body,
        userId: session.userId
      });

      return res.status(200).json(cleanNewDeal);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

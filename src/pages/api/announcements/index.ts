// pages/api/announcements/index.ts — GET and POST announcements (Optimized with TTL Cache)
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
    const announcements = db.collection('announcements');

    if (req.method === 'GET') {
      const activeOnly = req.query.active_only === 'true';
      const cacheKey = `announcements_${activeOnly ? 'active' : 'all'}`;

      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
        return res.status(200).json(cached);
      }

      const query = activeOnly ? { active: true } : {};
      const list = await announcements.find(query).sort({ pinned: -1, createdAt: -1 }).toArray();
      const result = list.map(({ _id, ...a }) => a);

      setCached(cacheKey, result, 15); // 15s TTL Cache
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      if (!session || !['admin', 'super_admin'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }
      const newAnn = { id: genId('ANN'), createdAt: nowISO(), active: true, ...req.body };
      await announcements.insertOne(newAnn);

      invalidateCache('announcements'); // Invalidate cache on creation

      const { _id, ...clean } = newAnn as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

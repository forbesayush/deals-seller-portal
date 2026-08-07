import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    const products = db.collection('products');
    const tombstones = db.collection('deleted_tombstones');

    // GET list of products
    if (req.method === 'GET') {
      const cacheKey = `products_list_${req.query.active || ''}_${req.query.q || ''}`;
      const cached = getCached<any[]>(cacheKey);
      if (cached) return res.status(200).json(cached);

      const deletedDocs = await tombstones.find({ targetCollection: 'products' }).toArray();
      const deletedSet = new Set(deletedDocs.map(t => String(t.targetId).toLowerCase()));

      let allDocs = await products.find({}).toArray();
      const cleanProducts = allDocs.filter(p => !deletedSet.has(String(p.id).toLowerCase()));
      const result = cleanProducts.map(({ _id, ...p }) => p);
      setCached(cacheKey, result, 5);
      return res.status(200).json(result);
    }

    // POST create new product (product_manager or admin)
    if (req.method === 'POST') {
      if (!session || !['admin', 'super_admin', 'manager', 'product_manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin access required' });
      }
      const newProduct = req.body;
      await products.insertOne(newProduct);
      return res.status(200).json(newProduct);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

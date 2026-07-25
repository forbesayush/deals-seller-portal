// pages/api/deals/[id].ts — GET, PUT/PATCH, DELETE a deal + /claim, /clone, /slots sub-routes
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    const deals = db.collection('deals');
    const claims = db.collection('claims');
    const userActivity = db.collection('user_activity');

    const parts = (req.query.id as string[]) || [];
    const dealId = parts[0];
    const subRoute = parts[1]; // 'claim', 'clone', 'slots'

    const deal = await deals.findOne({ id: dealId });
    if (!deal) return res.status(404).json({ detail: 'Deal not found' });

    // ── CLAIM ──
    if (req.method === 'POST' && subRoute === 'claim') {
      if (!session) return res.status(401).json({ detail: 'Authentication required' });

      const existing = await claims.findOne({ userId: session.userId, dealId, status: 'active' });
      if (existing) {
        const { _id, ...c } = existing as any;
        return res.status(200).json({ success: true, claim: c, message: 'Already claimed' });
      }

      const available = (deal.slots || 0) - (deal.claimedCount || 0);
      if (available <= 0) {
        await deals.updateOne({ id: dealId }, { $set: { active: false } });
        return res.status(400).json({ detail: 'No slots remaining' });
      }

      const newCount = (deal.claimedCount || 0) + 1;
      const nowActive = newCount < deal.slots;
      await deals.updateOne({ id: dealId }, { $set: { claimedCount: newCount, active: nowActive } });

      const newClaim = {
        id: genId('CLM'), userId: session.userId, dealId,
        productCode: deal.productCode, productName: deal.productName, cashback: deal.cashback,
        claimedAt: nowISO(), expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'active',
      };
      await claims.insertOne(newClaim);
      await userActivity.insertOne({ id: genId('ACT'), userId: session.userId, action: 'Claimed Deal Slot', details: `Reserved slot for ${deal.productName}`, timestamp: nowISO() });

      const { _id, ...clean } = newClaim as any;
      return res.status(200).json({ success: true, claim: clean });
    }

    // ── GET ──
    if (req.method === 'GET') {
      if (session?.role === 'buyer' && !deal.active) {
        return res.status(403).json({ detail: 'Deal is inactive' });
      }
      const { _id, ...d } = deal as any;
      return res.status(200).json(d);
    }

    // ── DELETE ──
    if (req.method === 'DELETE') {
      if (!session || !['admin', 'super_admin', 'manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }
      await deals.deleteOne({ id: dealId });
      return res.status(200).json({ success: true });
    }

    // ── PUT / PATCH ──
    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!session || !['admin', 'super_admin', 'manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }

      if (subRoute === 'clone') {
        const newId = genId('DEA');
        const cloned = { ...deal, id: newId, claimedCount: 0, productCode: deal.productCode + '-CLONE', productName: deal.productName + ' (Copy)' };
        delete (cloned as any)._id;
        await deals.insertOne(cloned);
        const { _id, ...clean } = cloned as any;
        return res.status(200).json(clean);
      }

      if (subRoute === 'slots') {
        const newSlots = parseInt(req.body.slots || req.body.new_slots || '0');
        const nowActive = newSlots > (deal.claimedCount || 0);
        await deals.updateOne({ id: dealId }, { $set: { slots: newSlots, active: nowActive } });
        const updated = await deals.findOne({ id: dealId });
        const { _id, ...clean } = updated as any;
        return res.status(200).json(clean);
      }

      await deals.updateOne({ id: dealId }, { $set: req.body });
      const updated = await deals.findOne({ id: dealId });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}

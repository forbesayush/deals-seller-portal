// pages/api/auth/unlock-account.ts — Admin: manually clear login lockout for a user
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export default requireAdmin(async function handler(req, res, _adminUser) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, detail: 'identifier (email/username) is required.' });
    }

    const cleanId = (typeof identifier === 'string' ? identifier : '').trim().toLowerCase();
    const db = await connectDB();

    // Delete all login_attempts records for this identifier (clears the lockout for all IPs)
    const result = await db.collection('login_attempts').deleteMany({ identifier: cleanId });

    return res.status(200).json({
      success: true,
      message: `Account unlocked. Removed ${result.deletedCount} lockout record(s) for "${cleanId}".`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

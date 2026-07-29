// lib/syncEngine.ts — Atomic MongoDB Delete & Add Sync Engine for Deals Seller Portal
import { Db } from 'mongodb';
import { genId, nowISO } from './auth';
import { invalidateCache } from './cache';

export interface SyncDeleteOptions {
  db: Db;
  targetId: string;
  userId?: string;
}

export interface SyncAddOptions {
  db: Db;
  dealData: any;
  userId?: string;
}

/**
 * Atomic MongoDB Delete Sync Technique
 * Purges matching deals, records tombstone, cleans linked claims, and invalidates cache.
 */
export async function syncDeleteDeal({ db, targetId, userId = 'admin' }: SyncDeleteOptions) {
  const deals = db.collection('deals');
  const claims = db.collection('claims');
  const tombstones = db.collection('deleted_tombstones');
  const userActivity = db.collection('user_activity');

  const queryTarget = targetId ? decodeURIComponent(targetId).trim() : '';
  if (!queryTarget) return { success: false, deletedCount: 0 };

  // 1. Delete matching documents from deals collection across all identifiers
  const deleteResult = await deals.deleteMany({
    $or: [
      { id: queryTarget },
      { productCode: queryTarget },
      { productName: { $regex: new RegExp(`^${escapeRegex(queryTarget)}$`, 'i') } }
    ]
  });

  // 2. Upsert Tombstone Record to prevent ghost resurrection
  await tombstones.updateOne(
    { targetId: queryTarget.toLowerCase() },
    {
      $set: {
        targetId: queryTarget.toLowerCase(),
        deletedAt: nowISO(),
        deletedBy: userId,
      }
    },
    { upsert: true }
  );

  // 3. Cascade cleanup linked claims
  await claims.deleteMany({
    $or: [
      { dealId: queryTarget },
      { productCode: queryTarget }
    ]
  });

  // 4. Write Activity Audit Log
  await userActivity.insertOne({
    id: genId('ACT'),
    userId,
    action: 'DELETE_DEAL_SYNC',
    details: `Atomic sync delete executed for target '${queryTarget}' (${deleteResult.deletedCount} items deleted)`,
    timestamp: nowISO()
  });

  // 5. Invalidate server in-memory TTL cache completely
  invalidateCache();

  return {
    success: true,
    deletedCount: deleteResult.deletedCount,
    target: queryTarget
  };
}

/**
 * Atomic MongoDB Add Sync Technique
 * Clears tombstones, creates clean deal, writes audit log, and invalidates cache.
 */
export async function syncAddDeal({ db, dealData, userId = 'admin' }: SyncAddOptions) {
  const deals = db.collection('deals');
  const tombstones = db.collection('deleted_tombstones');
  const userActivity = db.collection('user_activity');

  const id = dealData.id || genId('DEA');
  const productCode = dealData.productCode || dealData.code || id;
  const productName = dealData.productName || dealData.brand || 'New Deal';

  // 1. Remove from tombstone collection if previously deleted
  await tombstones.deleteMany({
    $or: [
      { targetId: id.toLowerCase() },
      { targetId: String(productCode).toLowerCase() },
      { targetId: String(productName).toLowerCase() }
    ]
  });

  // 2. Insert new clean deal record
  const newDeal = {
    id,
    productCode,
    productName,
    active: dealData.active !== false,
    claimedCount: 0,
    createdAt: nowISO(),
    ...dealData
  };
  await deals.insertOne(newDeal);

  // 3. Log audit event
  await userActivity.insertOne({
    id: genId('ACT'),
    userId,
    action: 'ADD_DEAL_SYNC',
    details: `Atomic sync add created deal '${productName}' (${productCode})`,
    timestamp: nowISO()
  });

  // 4. Invalidate server in-memory TTL cache
  invalidateCache();

  const { _id, ...clean } = newDeal as any;
  return clean;
}

/**
 * Helper to escape special regex characters
 */
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

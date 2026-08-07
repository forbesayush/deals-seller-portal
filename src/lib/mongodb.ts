// lib/mongodb.ts — Optimized Singleton MongoDB Connection & Index Management
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'deals_seller';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
let indexesCreated = false;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoDbInstance: Db | undefined;
}

if (!uri) {
  console.warn('[MongoDB] MONGODB_URI is not set. Database calls will fail. Add it to .env.local and Vercel environment variables.');
}

// Optimized connection pool options for serverless
const options = {
  tls: true,
  maxPoolSize: 25,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 20000,
  serverSelectionTimeoutMS: 8000,
};

if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = Promise.reject(new Error('MONGODB_URI is missing'));
}

/**
 * Ensures indexes exist on MongoDB collections for lightning-fast lookups (runs once per process)
 */
async function ensureIndexes(db: Db) {
  if (indexesCreated) return;
  indexesCreated = true;
  try {
    const orders = db.collection('orders');
    const users = db.collection('users');
    const deals = db.collection('deals');
    const wallets = db.collection('wallets');
    const transactions = db.collection('transactions');
    const auditLogs = db.collection('audit_logs');
    // Auth protocol collections
    const authEvents = db.collection('auth_events');
    const loginAttempts = db.collection('login_attempts');
    const tokenBlacklist = db.collection('token_blacklist');
    const passwordResets = db.collection('password_resets');

    // Asynchronously create indexes without blocking
    Promise.all([
      orders.createIndex({ orderNo: 1 }, { unique: true }),
      orders.createIndex({ buyerId: 1, submittedDate: -1 }),
      orders.createIndex({ orderCode: 1 }),
      orders.createIndex({ code: 1 }),
      orders.createIndex({ productCode: 1 }),
      orders.createIndex({ currentStatus: 1 }),
      users.createIndex({ email: 1 }),
      users.createIndex({ id: 1 }, { unique: true }),
      users.createIndex({ role: 1 }),
      deals.createIndex({ active: 1, platform: 1 }),
      deals.createIndex({ productCode: 1 }),
      wallets.createIndex({ userId: 1 }, { unique: true }),
      transactions.createIndex({ userId: 1, timestamp: -1 }),
      transactions.createIndex({ orderId: 1 }),
      auditLogs.createIndex({ timestamp: -1 }),
      auditLogs.createIndex({ action: 1 }),
      // Auth protocol indexes
      authEvents.createIndex({ timestamp: -1 }),
      authEvents.createIndex({ action: 1 }),
      authEvents.createIndex({ userId: 1 }),
      loginAttempts.createIndex({ identifier: 1, ip: 1 }),
      loginAttempts.createIndex({ lockedUntil: 1 }),
      tokenBlacklist.createIndex({ token: 1 }, { unique: true }),
      tokenBlacklist.createIndex({ expiry: 1 }, { expireAfterSeconds: 0 }), // MongoDB TTL auto-prune
      passwordResets.createIndex({ tokenHash: 1 }),
      passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // TTL auto-prune
    ]).catch(err => {
      console.warn('[MongoDB Indexing Warning]', err.message);
    });
  } catch { /* background index creation failure ignored */ }
}

export async function connectDB(): Promise<Db> {
  if (global._mongoDbInstance) {
    return global._mongoDbInstance;
  }

  const connectedClient = await clientPromise;
  const db = connectedClient.db(DB_NAME);
  global._mongoDbInstance = db;
  
  ensureIndexes(db);
  return db;
}

export async function getCollection(name: string) {
  const db = await connectDB();
  return db.collection(name);
}

export default clientPromise;

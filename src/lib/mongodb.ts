// lib/mongodb.ts
// Singleton MongoDB connection — reused across all API route invocations (serverless safe)
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'deals_seller';

if (!MONGODB_URI) {
  console.warn('[MongoDB] MONGODB_URI is not set. Database calls will fail. Add it to your .env.local and Vercel environment variables.');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(DB_NAME);

  return cachedDb;
}

export async function getCollection(name: string) {
  const db = await connectDB();
  return db.collection(name);
}

// lib/mongodb.ts
// Singleton MongoDB connection — reused across all API route invocations (serverless safe)
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'deals_seller';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  console.warn('[MongoDB] MONGODB_URI is not set. Database calls will fail. Add it to your .env.local and Vercel environment variables.');
}

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        tls: true,
        serverSelectionTimeoutMS: 10000,
      });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, {
      tls: true,
      serverSelectionTimeoutMS: 10000,
    });
    clientPromise = client.connect();
  }
} else {
  clientPromise = Promise.reject(new Error('MONGODB_URI is missing'));
}

export async function connectDB(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(DB_NAME);
}

export async function getCollection(name: string) {
  const db = await connectDB();
  return db.collection(name);
}

export default clientPromise;

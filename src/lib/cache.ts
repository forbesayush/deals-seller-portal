// lib/cache.ts — High-Performance In-Memory TTL Cache Engine for Serverless API Routes
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

declare global {
  var _apiCacheStore: Map<string, CacheEntry<any>> | undefined;
}

if (!global._apiCacheStore) {
  global._apiCacheStore = new Map<string, CacheEntry<any>>();
}

const store = global._apiCacheStore;

/**
 * Retrieve cached value if valid and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Save value to cache with Time-To-Live (seconds)
 */
export function setCached<T>(key: string, data: T, ttlSeconds: number = 10): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate matching keys or clear cache entirely
 */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    store.clear();
    return;
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(keyOrPrefix) || k.includes(keyOrPrefix)) {
      store.delete(k);
    }
  }
}

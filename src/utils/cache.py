"""
High-Performance In-Memory TTL Cache Engine for FastAPI Backend.
Handles micro-caching for high-frequency endpoints during traffic spikes.
"""

import time
import threading
from typing import Any, Optional, Dict, Tuple

class MemoryCache:
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieve item from cache if not expired."""
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                self._misses += 1
                return None
            data, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                self._misses += 1
                return None
            self._hits += 1
            return data

    def set(self, key: str, value: Any, ttl_seconds: int = 10) -> None:
        """Store item in cache with TTL in seconds."""
        with self._lock:
            expires_at = time.time() + ttl_seconds
            self._store[key] = (value, expires_at)

    def invalidate(self, prefix_or_key: Optional[str] = None) -> None:
        """Clear specific key, keys matching prefix, or entire cache."""
        with self._lock:
            if not prefix_or_key:
                self._store.clear()
                return
            keys_to_del = [
                k for k in self._store.keys()
                if k == prefix_or_key or k.startswith(prefix_or_key) or prefix_or_key in k
            ]
            for k in keys_to_del:
                self._store.pop(k, None)

    def stats(self) -> Dict[str, Any]:
        """Return cache statistics."""
        with self._lock:
            now = time.time()
            active_entries = sum(1 for _, exp in self._store.values() if exp > now)
            return {
                "active_entries": active_entries,
                "total_entries": len(self._store),
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio": round(self._hits / (self._hits + self._misses), 4) if (self._hits + self._misses) > 0 else 0.0
            }

# Global singleton cache instance for FastAPI backend
backend_cache = MemoryCache()

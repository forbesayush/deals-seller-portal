"""
Automated Test Suite for Scaling & High Concurrency Optimizations.
Tests:
- Micro-caching TTL and hit/miss rates
- Memory Cache invalidation & statistics
- Sliding-window rate limiter class logic
- Database connection pool configuration
"""

import time
import pytest
from src.utils.cache import MemoryCache, backend_cache
from src.database.db import DB_POOL_SIZE, DB_MAX_OVERFLOW
from src.middleware.rate_limiter import RateLimiterMiddleware


def test_memory_cache_operations():
    """Verify TTL cache get, set, expiration, invalidation, and statistics."""
    cache = MemoryCache()
    
    # 1. Set and Get
    cache.set("test_key", {"status": "ok"}, ttl_seconds=2)
    val = cache.get("test_key")
    assert val == {"status": "ok"}

    # 2. Cache Hit Statistics
    stats = cache.stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 0
    assert stats["hit_ratio"] == 1.0

    # 3. Cache Miss & Invalidation
    cache.invalidate("test_")
    assert cache.get("test_key") is None
    
    stats_after = cache.stats()
    assert stats_after["misses"] == 1


def test_cache_expiration():
    """Verify that cached data expires after TTL."""
    cache = MemoryCache()
    cache.set("expiring_key", "data", ttl_seconds=0.1)
    assert cache.get("expiring_key") == "data"
    
    time.sleep(0.15)
    assert cache.get("expiring_key") is None


def test_database_connection_pool_configuration():
    """Verify that database connection pool environment variables and settings are configured."""
    assert DB_POOL_SIZE >= 10
    assert DB_MAX_OVERFLOW >= 20


def test_rate_limiter_cleaning_and_window_logic():
    """Test rate limiter request timestamp tracking and window cleaning."""
    limiter = RateLimiterMiddleware(app=None, default_rate_limit=5, window_seconds=1)
    
    now = time.time()
    limiter.requests["127.0.0.1"] = [now - 2, now - 0.5, now - 0.2]
    
    limiter._clean_old_requests("127.0.0.1", now)
    
    # The timestamp from 2 seconds ago should be cleaned out
    assert len(limiter.requests["127.0.0.1"]) == 2

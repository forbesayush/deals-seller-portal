"""
Sliding-Window Rate Limiter Middleware for FastAPI.
Protects application endpoints from traffic spikes, brute force, and DDoS.
"""

import time
import os
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        auth_rate_limit: int = 15,         # Max requests per minute for auth endpoints
        default_rate_limit: int = 300,      # Max requests per minute for general API endpoints
        window_seconds: int = 60,
        enabled: bool = True
    ):
        super().__init__(app)
        self.auth_rate_limit = int(os.getenv("RATE_LIMIT_AUTH", str(auth_rate_limit)))
        self.default_rate_limit = int(os.getenv("RATE_LIMIT_DEFAULT", str(default_rate_limit)))
        self.window_seconds = window_seconds
        self.enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
        # Structure: IP -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def _clean_old_requests(self, ip: str, now: float):
        """Remove request timestamps older than sliding window."""
        cutoff = now - self.window_seconds
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        # Allow CORS preflight OPTIONS request
        if request.method == "OPTIONS":
            return await call_next(request)

        # Obtain client identifier (IP address or Authorization token prefix)
        client_ip = request.client.host if request.client else "127.0.0.1"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        now = time.time()
        path = request.url.path.lower()

        # Determine rate limit based on path
        is_auth_route = "/api/auth/" in path or "/login" in path or "/register" in path
        limit = self.auth_rate_limit if is_auth_route else self.default_rate_limit

        self._clean_old_requests(client_ip, now)
        timestamps = self.requests[client_ip]

        if len(timestamps) >= limit:
            retry_after = int(self.window_seconds - (now - timestamps[0]))
            retry_after = max(1, retry_after)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down and try again later.",
                    "retry_after_seconds": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + retry_after))
                }
            )

        # Record request timestamp
        timestamps.append(now)
        remaining = max(0, limit - len(timestamps))

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(now + self.window_seconds))

        return response

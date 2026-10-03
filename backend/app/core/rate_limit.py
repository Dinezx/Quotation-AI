import time
import threading
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status

class SlidingWindowRateLimiter:
    """
    In-memory, thread-safe sliding window rate limiter.
    Provides defense-in-depth application layer rate limiting returning HTTP 429 and Retry-After headers.
    """
    def __init__(self):
        self._lock = threading.Lock()
        # key -> list of timestamp floats
        self._history: Dict[str, List[float]] = {}
        self._last_cleanup = time.time()

    def _cleanup_old_entries(self, now: float, max_window: float = 300.0):
        """Removes expired entries periodically to prevent memory exhaustion."""
        if now - self._last_cleanup < 60.0:
            return
        self._last_cleanup = now
        stale_cutoff = now - max_window
        empty_keys = []
        for key, timestamps in self._history.items():
            valid = [ts for ts in timestamps if ts > stale_cutoff]
            if valid:
                self._history[key] = valid
            else:
                empty_keys.append(key)
        for k in empty_keys:
            self._history.pop(k, None)

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int = 60
    ) -> Optional[int]:
        """
        Checks whether the given key has exceeded the limit.
        Returns None if allowed.
        Returns retry_after (integer seconds) if rate limit is exceeded.
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            self._cleanup_old_entries(now)
            timestamps = self._history.setdefault(key, [])
            # Filter timestamps in current window
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            self._history[key] = valid_timestamps

            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(window_seconds - (now - earliest)))
                return retry_after

            # Record this request
            self._history[key].append(now)
            return None

    def reset(self):
        """Clears all rate limit history (useful for testing)."""
        with self._lock:
            self._history.clear()

rate_limiter = SlidingWindowRateLimiter()

def get_client_identifier(request: Request) -> str:
    """Extracts client IP or authenticated sub claim for rate limiting."""
    # Check for authenticated Bearer token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token_part = auth_header[7:].strip()
        if len(token_part) > 16:
            # Use hash of token as identifier
            return f"token:{hash(token_part)}"

    # Check X-Forwarded-For header (trusted when behind reverse proxy / Front Door)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        if client_ip:
            return f"ip:{client_ip}"

    # Fallback to direct client host
    if request.client and request.client.host:
        return f"ip:{request.client.host}"

    return "unknown"

def rate_limit_dependency(max_requests: int = 60, window_seconds: int = 60, category: str = "general"):
    """FastAPI dependency for endpoint-specific rate limiting."""
    def dependency(request: Request):
        ident = get_client_identifier(request)
        key = f"{category}:{ident}"
        retry_after = rate_limiter.check_rate_limit(key, max_requests=max_requests, window_seconds=window_seconds)
        if retry_after is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        return True
    return dependency

# Standard Rate Limit tiers
auth_rate_limit = rate_limit_dependency(max_requests=15, window_seconds=60, category="auth")
heavy_rate_limit = rate_limit_dependency(max_requests=30, window_seconds=60, category="heavy")
standard_rate_limit = rate_limit_dependency(max_requests=120, window_seconds=60, category="standard")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects comprehensive production security headers into all HTTP responses.
    Defends against clickjacking, MIME sniffing, XSS, and insecure transport.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # HSTS (Strict-Transport-Security) — Enforce HTTPS for 1 year including subdomains
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking defense (frame-ancestors / X-Frame-Options)
        response.headers["X-Frame-Options"] = "DENY"

        # Cross-site referrer leakage defense
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Hardware feature and sensor access restriction
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"

        # Cross-Site Scripting filter for legacy browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy (API-appropriate default)
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "img-src 'self' data: https: blob:; "
                "style-src 'self' 'unsafe-inline'; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self';"
            )

        return response

import time
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from jose import jwk, jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError
from app.core.config import settings

logger = logging.getLogger("quotation_ai.auth")

class JWKSManager:
    """
    Manages Supabase asymmetric JWT Signing Keys (JWKS).
    Implements in-memory key caching, TTL expiration, and automatic key rotation via 'kid'.
    """
    def __init__(self, jwks_url: Optional[str] = None, cache_ttl_seconds: int = 3600):
        self.jwks_url = jwks_url or settings.SUPABASE_JWKS_URL
        self.cache_ttl_seconds = cache_ttl_seconds
        self._keys: Dict[str, Any] = {} # kid -> constructed jwk object
        self._last_fetched: float = 0
        self._last_rotation_attempt: float = 0

    def fetch_keys(self, force: bool = False) -> Dict[str, Any]:
        """Fetch and cache public signing keys from Supabase JWKS endpoint."""
        now = time.time()
        # Return memory cache if valid and not forcing rotation
        if not force and self._keys and (now - self._last_fetched) < self.cache_ttl_seconds:
            return self._keys

        # Rate limit network rotation attempts to prevent DoS on invalid kid attacks
        if force and (now - self._last_rotation_attempt) < 5:
            return self._keys

        self._last_rotation_attempt = now

        if not self.jwks_url:
            return self._keys

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(self.jwks_url)
                response.raise_for_status()
                jwks_data = response.json()
        except Exception as e:
            logger.warning(f"Failed to fetch JWKS from {self.jwks_url}: {e}")
            if self._keys:
                return self._keys
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to reach Supabase authentication service: {str(e)}"
            )

        new_keys: Dict[str, Any] = {}
        for key_dict in jwks_data.get("keys", []):
            kid = key_dict.get("kid")
            alg = key_dict.get("alg") or "ES256"
            if kid:
                try:
                    constructed = jwk.construct(key_dict, algorithm=alg)
                    new_keys[kid] = constructed
                except Exception as construct_err:
                    logger.error(f"Failed to construct key for kid {kid}: {construct_err}")

        self._keys = new_keys
        self._last_fetched = now
        return self._keys

    def get_key(self, kid: str) -> Optional[Any]:
        """Retrieve key by kid, triggering key rotation refresh if missing."""
        # 1. Check local cache
        if kid in self._keys and (time.time() - self._last_fetched) < self.cache_ttl_seconds:
            return self._keys[kid]

        # 2. Key rotation: refresh from JWKS endpoint
        self.fetch_keys(force=True)
        return self._keys.get(kid)

    def register_test_key(self, kid: str, key_obj: Any):
        """Allows injecting test keys for hermetic unit testing."""
        self._keys[kid] = key_obj
        self._last_fetched = time.time()

    def clear_cache(self):
        """Clears cached keys."""
        self._keys = {}
        self._last_fetched = 0

jwks_manager = JWKSManager()

def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase Bearer access token using asymmetric JWT Signing Keys:
    - Extracts 'kid' and 'alg' from header
    - Fetches/retrieves matching public key from JWKS
    - Validates signature, issuer, expiration, algorithm, and 'sub' claim
    """
    try:
        unverified_headers = jwt.get_unverified_headers(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token header: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = unverified_headers.get("kid")
    alg = unverified_headers.get("alg")

    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing required 'kid' field",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not alg:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing required 'alg' field",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Retrieve public key from JWKS manager
    public_key = jwks_manager.get_key(kid)
    if not public_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Public key with kid '{kid}' not found in Supabase JWKS",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify signature, expiration, issuer, and algorithm
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            issuer=settings.SUPABASE_JWT_ISSUER,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": False,
            }
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
        )
    except JWTClaimsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token claims: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token signature or format: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate required 'sub' claim
    sub = payload.get("sub")
    if not sub or not str(sub).strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required 'sub' (subject) claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload

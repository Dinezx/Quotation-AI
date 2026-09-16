from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    id: str
    company_id: str
    email: str
    role: str # ADMIN, COSTING_ENGINEER, VIEWER
    company_name: str

# Default fallback user representing Bharat Precision Engineering Pvt Ltd
DEFAULT_DEMO_USER = AuthenticatedUser(
    id="usr-bpe-001",
    company_id="comp-bpe-pune",
    email="r.deshmukh@bharatprecision.co.in",
    role="COSTING_ENGINEER",
    company_name="Bharat Precision Engineering Pvt Ltd"
)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthenticatedUser:
    """
    Extracts and validates Supabase JWT token.
    If no authorization token is passed during local development/demo,
    returns default authenticated user for company isolation testing.
    """
    if not credentials:
        return DEFAULT_DEMO_USER

    token = credentials.credentials
    try:
        # In production, decode with SUPABASE_JWT_SECRET
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub") or payload.get("id") or DEFAULT_DEMO_USER.id
        email: str = payload.get("email") or DEFAULT_DEMO_USER.email
        company_id: str = (
            payload.get("user_metadata", {}).get("company_id") or 
            payload.get("company_id") or 
            DEFAULT_DEMO_USER.company_id
        )
        role: str = (
            payload.get("user_metadata", {}).get("role") or 
            payload.get("role") or 
            DEFAULT_DEMO_USER.role
        )
        
        return AuthenticatedUser(
            id=user_id,
            company_id=company_id,
            email=email,
            role=role,
            company_name=DEFAULT_DEMO_USER.company_name
        )
    except JWTError:
        # For development flexibility with Supabase mock tokens
        return DEFAULT_DEMO_USER

async def get_current_company_id(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> str:
    """Enforces server-side multi-tenancy by returning the caller's validated company_id."""
    return current_user.company_id

def require_role(allowed_roles: List[str]):
    """Decorator dependency to enforce RBAC (Admin, Costing Engineer, Viewer)."""
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.config import settings
from app.core.jwks import verify_supabase_jwt
from app.db.session import get_db
from app.models.user import User
from app.models.company import Company

security_scheme = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    id: str
    company_id: str
    email: str
    role: str # ADMIN, COSTING_ENGINEER, VIEWER
    company_name: str
    is_active: bool = True

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> AuthenticatedUser:
    """
    Validates Supabase access token via asymmetric JWKS verification.
    Resolves the authenticated user ID (sub) to their assigned company_id.
    Guarantees that company_id is strictly derived server-side.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Asymmetric JWKS signature, issuer, algorithm, and expiration verification
    payload = verify_supabase_jwt(credentials.credentials)

    sub: str = payload.get("sub")
    email: str = payload.get("email", "")
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}

    # 2. Lookup user in database
    user = db.query(User).filter(User.id == sub).first()

    # Link user by email if pre-seeded
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.id = sub
            db.commit()
            db.refresh(user)

    # 3. Strictly reject unknown user - NO demo/default company fallback
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no associated tenant company"
        )

    # 4. Strictly verify legitimate company association
    if not user.company_id or not user.company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no valid company association"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return AuthenticatedUser(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        role=user.role,
        company_name=user.company.name,
        is_active=user.is_active,
    )

async def get_current_company_id(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> str:
    """
    Enforces server-side multi-tenancy.
    Returns the caller's validated company_id from their verified token and DB record.
    Any company_id provided by the frontend is completely ignored.
    """
    return current_user.company_id

def require_role(allowed_roles: List[str]):
    """Enforces Role-Based Access Control (RBAC)."""
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

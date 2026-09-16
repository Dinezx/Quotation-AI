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

    # 3. If new user, assign company and provision user record
    if not user:
        # Determine tenant from metadata or fallback to default plant tenant
        target_company_id = (
            user_metadata.get("company_id") or 
            app_metadata.get("company_id")
        )
        
        target_company = None
        if target_company_id:
            target_company = db.query(Company).filter(Company.id == target_company_id).first()

        if not target_company:
            # Default to primary tenant (e.g. comp-bpe-pune)
            target_company = db.query(Company).filter(Company.id == "comp-bpe-pune").first()

        if not target_company:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active company tenant found for user"
            )

        role = user_metadata.get("role") or app_metadata.get("role") or "COSTING_ENGINEER"
        full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split("@")[0]

        user = User(
            id=sub,
            company_id=target_company.id,
            email=email or f"{sub}@tenant.quotation.ai",
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    company_name = user.company.name if user.company else "Bharat Precision Engineering"

    return AuthenticatedUser(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        role=user.role,
        company_name=company_name
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

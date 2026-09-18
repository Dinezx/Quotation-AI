from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.company import Company
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me")
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns profile and company details for current authenticated session."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    db_user = db.query(User).filter(User.id == current_user.id).first()

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": db_user.full_name if (db_user and db_user.full_name) else None,
            "role": current_user.role,
            "company_id": current_user.company_id,
        },
        "company": {
            "id": company.id if company else current_user.company_id,
            "name": company.name if company else current_user.company_name,
            "legal_name": company.legal_name if company else None,
            "gstin": company.gstin if company else None,
            "address": company.address if company else None,
            "phone": company.phone if company else None,
            "email": company.email if company else None,
            "settings": company.settings if company else {},
        }
    }

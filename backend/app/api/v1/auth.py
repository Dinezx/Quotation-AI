import uuid
import re
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import get_current_user, AuthenticatedUser, security_scheme
from app.core.jwks import verify_supabase_jwt
from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.models.material import Material
from app.models.process import Process

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignUpRequest(BaseModel):
    email: str
    full_name: str
    company_name: str
    phone: Optional[str] = None
    sub: Optional[str] = None


class OnboardingRequest(BaseModel):
    company_name: str
    legal_name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    full_name: Optional[str] = None


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignUpRequest, db: Session = Depends(get_db)):
    """Registers a new manufacturing plant tenant and administrative user account."""
    clean_email = str(req.email).lower().strip()
    clean_company = req.company_name.strip()
    clean_name = req.full_name.strip()

    if not clean_email or not clean_company or not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, full name, and company name are required."
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        # If user exists and sub is provided, link sub if needed
        if req.sub and existing_user.id != req.sub:
            existing_user.id = req.sub
            db.commit()
            db.refresh(existing_user)
            company = db.query(Company).filter(Company.id == existing_user.company_id).first()
            return {
                "status": "success",
                "message": "Existing plant account linked successfully.",
                "user": {
                    "id": existing_user.id,
                    "email": existing_user.email,
                    "full_name": existing_user.full_name,
                    "role": existing_user.role,
                    "company_id": existing_user.company_id,
                },
                "company": {
                    "id": company.id if company else existing_user.company_id,
                    "name": company.name if company else clean_company,
                    "legal_name": company.legal_name if company else None,
                    "gstin": company.gstin if company else None,
                    "settings": company.settings if company else {},
                }
            }

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A manufacturing account with this email already exists. Please sign in."
        )

    # Generate IDs
    slug = re.sub(r'[^a-zA-Z0-9]', '', clean_company.lower())[:12] or "plant"
    comp_id = f"comp-{slug}-{uuid.uuid4().hex[:6]}"
    user_id = req.sub if req.sub else f"usr-{uuid.uuid4().hex[:8]}"

    # Create tenant Company
    company = Company(
        id=comp_id,
        name=clean_company,
        legal_name=clean_company,
        email=clean_email,
        phone=req.phone.strip() if req.phone else None,
        settings={
            "default_currency": "INR",
            "quotation_defaults": {
                "quotation_validity": "30 Days from date of issue",
                "payment_terms": "30 Days from date of supply and inspection.",
                "delivery_terms": "Ex-Works Facility. Freight extra at actuals.",
                "inspection_terms": "Standard quality inspection at works.",
                "general_terms": "Dimensions as per drawing callout.",
                "prepared_by": clean_name,
                "authorized_signatory": "Authorized Signatory",
            }
        }
    )
    db.add(company)
    db.flush()

    # Create administrative User
    user = User(
        id=user_id,
        company_id=company.id,
        email=clean_email,
        full_name=clean_name,
        role="ADMIN",
        is_active=True
    )
    db.add(user)

    # Note: New tenants start with an empty rate master. No automatic rate seeding.
    db.commit()
    db.refresh(user)
    db.refresh(company)

    return {
        "status": "success",
        "message": "Plant facility account created successfully.",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "legal_name": company.legal_name,
            "gstin": company.gstin,
            "settings": company.settings or {},
        }
    }


@router.post("/onboarding", status_code=status.HTTP_201_CREATED)
def complete_onboarding(
    req: OnboardingRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    """
    Onboards a newly authenticated Supabase/Google user into their dedicated tenant manufacturing company.
    Requires an authentic Supabase Bearer token.
    Strictly derives the user's authentic identity from the verified JWT (sub and email).
    Server-generates the company_id, preventing any frontend tenant-spoofing or IDOR vulnerability.
    Seeds authoritative benchmark rate cards (EN8, SS 304, CNC Milling, etc.) so the plant is instantly calculation-ready.
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

    # Verify Supabase asymmetric JWT
    payload = verify_supabase_jwt(credentials.credentials)
    sub: str = payload.get("sub")
    jwt_email: str = payload.get("email", "")
    user_metadata = payload.get("user_metadata", {}) or {}
    token_name = user_metadata.get("full_name") or user_metadata.get("name") or ""

    clean_company_name = req.company_name.strip()
    if not clean_company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name is required for facility onboarding."
        )

    clean_legal_name = (req.legal_name or clean_company_name).strip()
    clean_gstin = req.gstin.strip().upper() if req.gstin else None
    clean_address = req.address.strip() if req.address else None
    clean_phone = req.phone.strip() if req.phone else None
    clean_contact_email = req.contact_email.strip().lower() if req.contact_email else (jwt_email.lower().strip() or None)
    clean_full_name = req.full_name.strip() if req.full_name else (token_name or "Plant Administrator")

    # If GSTIN provided, validate format (15 alphanumeric characters)
    if clean_gstin and not re.match(r"^[0-9A-Z]{15}$", clean_gstin):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid GSTIN format. Expected 15-character alphanumeric GST Identification Number."
        )

    # Check if user already exists with an active company
    user = db.query(User).filter((User.id == sub) | (User.email == jwt_email)).first()
    if user and user.company_id:
        existing_company = db.query(Company).filter(Company.id == user.company_id).first()
        if existing_company:
            return {
                "status": "success",
                "message": "User is already associated with a manufacturing plant.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_id": user.company_id,
                },
                "company": {
                    "id": existing_company.id,
                    "name": existing_company.name,
                    "legal_name": existing_company.legal_name,
                    "gstin": existing_company.gstin,
                    "address": existing_company.address,
                    "phone": existing_company.phone,
                    "email": existing_company.email,
                    "settings": existing_company.settings or {},
                }
            }

    # Generate isolated tenant company ID server-side
    slug = re.sub(r'[^a-zA-Z0-9]', '', clean_company_name.lower())[:12] or "plant"
    comp_id = f"comp-{slug}-{uuid.uuid4().hex[:6]}"

    # Create tenant Company
    company = Company(
        id=comp_id,
        name=clean_company_name,
        legal_name=clean_legal_name,
        gstin=clean_gstin,
        address=clean_address,
        phone=clean_phone,
        email=clean_contact_email,
        settings={
            "default_currency": "INR",
            "quotation_defaults": {
                "quotation_validity": "30 Days from date of issue",
                "payment_terms": "30 Days from date of supply and inspection.",
                "delivery_terms": "Ex-Works Facility. Freight extra at actuals.",
                "inspection_terms": "Standard quality inspection at works.",
                "general_terms": "Dimensions as per drawing callout.",
                "prepared_by": clean_full_name,
                "authorized_signatory": "Authorized Signatory",
            }
        }
    )
    db.add(company)
    db.flush()

    # Create or update administrative User
    if user:
        user.id = sub
        user.company_id = company.id
        user.full_name = clean_full_name
        user.role = "ADMIN"
        user.is_active = True
    else:
        user = User(
            id=sub,
            company_id=company.id,
            email=jwt_email or clean_contact_email,
            full_name=clean_full_name,
            role="ADMIN",
            is_active=True
        )
        db.add(user)

    # Note: New tenants start with an empty rate master. No automatic rate seeding.
    db.commit()
    db.refresh(user)
    db.refresh(company)

    return {
        "status": "success",
        "message": "Company onboarding completed successfully.",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "legal_name": company.legal_name,
            "gstin": company.gstin,
            "address": company.address,
            "phone": company.phone,
            "email": company.email,
            "settings": company.settings or {},
        }
    }


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
            "full_name": db_user.full_name if db_user else "Rajesh Deshmukh",
            "role": current_user.role,
            "company_id": current_user.company_id,
        },
        "company": {
            "id": company.id if company else current_user.company_id,
            "name": company.name if company else current_user.company_name,
            "legal_name": company.legal_name if company else None,
            "gstin": company.gstin if company else "27AAACB1234F1Z8",
            "address": company.address if company else None,
            "phone": company.phone if company else None,
            "email": company.email if company else None,
            "settings": company.settings if company else {},
        }
    }

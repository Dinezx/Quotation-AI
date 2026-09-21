import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_company_id, get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.company import Company
from app.schemas.company import (
    CompanyFullSettingsResponse,
    CompanyProfileUpdate,
    CompanyProfileResponse,
    CompanyTaxSettingsUpdate,
    CompanyTaxSettingsResponse,
    CompanyBankSettingsUpdate,
    CompanyBankSettingsResponse,
    CompanyQuotationDefaultsUpdate,
    CompanyQuotationDefaultsResponse,
    QuotationTemplateConfigUpdate,
    QuotationTemplateConfigResponse,
    TemplateGalleryItem,
)
from app.services.pdf.templates import list_gallery_templates, TEMPLATE_REGISTRY
from app.services.pdf.quotation_pdf_service import QuotationPDFService
from app.services.storage.storage_service import get_storage_service

router = APIRouter(prefix="/company", tags=["Company Settings"])

ALLOWED_LOGO_CONTENT_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}
MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB


@router.get("/settings", response_model=CompanyFullSettingsResponse)
def get_company_settings(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve full authoritative company settings snapshot for the authenticated tenant."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return CompanyFullSettingsResponse(
        profile=CompanyProfileResponse(**company.get_profile_data()),
        tax=CompanyTaxSettingsResponse(**company.get_tax_settings()),
        bank=CompanyBankSettingsResponse(**company.get_bank_settings()),
        defaults=CompanyQuotationDefaultsResponse(**company.get_quotation_defaults()),
        template=QuotationTemplateConfigResponse(**company.get_template_config()),
        logo_url=company.logo_url,
    )


@router.put("/profile", response_model=CompanyProfileResponse)
def update_company_profile(
    profile_in: CompanyProfileUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update authoritative manufacturer company profile and credentials."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Direct column updates
    if profile_in.name is not None:
        company.name = profile_in.name.strip()
    if profile_in.legal_name is not None:
        company.legal_name = profile_in.legal_name.strip()
    if profile_in.address is not None:
        company.address = profile_in.address.strip()
    if profile_in.gstin is not None:
        company.gstin = profile_in.gstin.strip().upper() if profile_in.gstin else None
    if profile_in.phone is not None:
        company.phone = profile_in.phone.strip() if profile_in.phone else None
    if profile_in.email is not None:
        company.email = profile_in.email.strip() if profile_in.email else None

    # Extended profile stored inside JSON settings
    curr_settings = dict(company.settings or {})
    curr_profile = dict(curr_settings.get("profile") or {})

    for field in ["city", "state", "pincode", "country", "website", "pan", "authorized_signatory"]:
        val = getattr(profile_in, field, None)
        if val is not None:
            curr_profile[field] = val.strip() if isinstance(val, str) else val

    curr_settings["profile"] = curr_profile
    company.settings = curr_settings

    db.commit()
    db.refresh(company)
    return CompanyProfileResponse(**company.get_profile_data())


@router.put("/tax", response_model=CompanyTaxSettingsResponse)
def update_company_tax_settings(
    tax_in: CompanyTaxSettingsUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update company GSTIN, tax mode (CGST_SGST, IGST, EXEMPT), and default GST rate."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    valid_modes = {"CGST_SGST", "IGST", "EXEMPT"}
    if tax_in.gst_type.upper() not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid GST type '{tax_in.gst_type}'. Supported modes: {', '.join(valid_modes)}"
        )

    if tax_in.gstin is not None:
        company.gstin = tax_in.gstin.strip().upper() if tax_in.gstin else None

    curr_settings = dict(company.settings or {})
    curr_settings["gst_type"] = tax_in.gst_type.upper()
    curr_settings["default_gst_rate"] = str(tax_in.default_gst_rate)
    company.settings = curr_settings

    db.commit()
    db.refresh(company)
    return CompanyTaxSettingsResponse(**company.get_tax_settings())


@router.put("/bank", response_model=CompanyBankSettingsResponse)
def update_company_bank_details(
    bank_in: CompanyBankSettingsUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update company remittance bank account, IFSC, and UPI details."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    curr_settings = dict(company.settings or {})
    bank_data = dict(curr_settings.get("bank_details") or {})

    for field in ["bank_name", "account_name", "account_number", "ifsc", "branch", "upi_id"]:
        val = getattr(bank_in, field, None)
        if val is not None:
            bank_data[field] = val.strip() if isinstance(val, str) else val
            # Mirror top-level keys for backward-compatibility with existing code
            if field == "account_number":
                curr_settings["bank_account"] = bank_data[field]
            elif field == "ifsc":
                curr_settings["bank_ifsc"] = bank_data[field]
            elif field == "branch":
                curr_settings["bank_branch"] = bank_data[field]
            else:
                curr_settings[field] = bank_data[field]

    curr_settings["bank_details"] = bank_data
    company.settings = curr_settings

    db.commit()
    db.refresh(company)
    return CompanyBankSettingsResponse(**company.get_bank_settings())


@router.put("/defaults", response_model=CompanyQuotationDefaultsResponse)
def update_company_quotation_defaults(
    defaults_in: CompanyQuotationDefaultsUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update quotation commercial defaults (validity, payment terms, delivery, inspection, signatory)."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    curr_settings = dict(company.settings or {})
    defaults_data = dict(curr_settings.get("quotation_defaults") or {})

    for field in ["quotation_validity", "payment_terms", "delivery_terms", "inspection_terms", "general_terms", "prepared_by", "authorized_signatory"]:
        val = getattr(defaults_in, field, None)
        if val is not None:
            defaults_data[field] = val.strip() if isinstance(val, str) else val

    curr_settings["quotation_defaults"] = defaults_data
    company.settings = curr_settings

    db.commit()
    db.refresh(company)
    return CompanyQuotationDefaultsResponse(**company.get_quotation_defaults())


@router.get("/templates", response_model=List[TemplateGalleryItem])
def get_template_gallery(
    company_id: str = Depends(get_current_company_id),
):
    """List all 8 professional quotation templates available in the gallery."""
    return [TemplateGalleryItem(**t) for t in list_gallery_templates()]


@router.get("/template", response_model=QuotationTemplateConfigResponse)
def get_active_template(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve currently active quotation template configuration."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return QuotationTemplateConfigResponse(**company.get_template_config())


@router.put("/template", response_model=QuotationTemplateConfigResponse)
def update_template_configuration(
    template_in: QuotationTemplateConfigUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update company's active quotation template selection and presentation styling."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if template_in.template_id is not None:
        t_id = template_in.template_id.lower().strip()
        if t_id not in TEMPLATE_REGISTRY:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Template '{template_in.template_id}' not found. Available: {', '.join(TEMPLATE_REGISTRY.keys())}"
            )

    curr_settings = dict(company.settings or {})
    curr_tmpl = dict(curr_settings.get("quotation_template") or {})

    for field, val in template_in.model_dump(exclude_unset=True).items():
        curr_tmpl[field] = val

    curr_settings["quotation_template"] = curr_tmpl
    company.settings = curr_settings

    db.commit()
    db.refresh(company)
    return QuotationTemplateConfigResponse(**company.get_template_config())


@router.post("/template/preview-pdf")
def preview_template_pdf(
    template_id: str = Query("classic_professional"),
    primary_color: Optional[str] = Query(None),
    secondary_color: Optional[str] = Query(None),
    font_family: Optional[str] = Query(None),
    show_bank_details: bool = Query(True),
    show_terms: bool = Query(True),
    show_signature: bool = Query(True),
    show_footer: bool = Query(True),
    footer_text: Optional[str] = Query(None),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """
    Renders live sample A4 quotation PDF on-the-fly for any template + customization settings.
    Zero modification to persisted quotation or company state.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    t_id = template_id.lower().strip()
    if t_id not in TEMPLATE_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown template '{template_id}'"
        )

    config_override = {
        "template_id": t_id,
        "show_bank_details": show_bank_details,
        "show_terms": show_terms,
        "show_signature": show_signature,
        "show_footer": show_footer,
    }
    if primary_color: config_override["primary_color"] = primary_color
    if secondary_color: config_override["secondary_color"] = secondary_color
    if font_family: config_override["font_family"] = font_family
    if footer_text: config_override["footer_text"] = footer_text

    pdf_bytes = QuotationPDFService.generate_sample_pdf(
        template_id=t_id,
        config=config_override,
        company=company,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="preview_{t_id}.pdf"',
            "Content-Type": "application/pdf",
        }
    )


@router.get("/logo")
def get_company_logo(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve and stream the company's official logo image."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.logo_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No logo configured for company")

    storage = get_storage_service()
    bucket = getattr(settings, "QUOTATION_PDF_BUCKET", "quotations")

    try:
        data = storage.download(bucket=bucket, path=company.logo_url)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logo file not found in storage")

    # Determine content-type from file extension
    ext = os.path.splitext(company.logo_url)[1].lower().lstrip(".")
    mime_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "svg": "image/svg+xml"}
    content_type = mime_map.get(ext, "application/octet-stream")

    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Type": content_type}
    )


@router.post("/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or replace company logo.
    Validates MIME type (PNG/JPEG/WEBP/SVG) and size (<= 5MB).
    Uploads to company-scoped storage and updates company.logo_url.
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_LOGO_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Allowed: PNG, JPEG, WebP, SVG."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded logo file is empty."
        )
    if len(file_bytes) > MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logo file exceeds maximum size of 5 MB."
        )

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    ext = ALLOWED_LOGO_CONTENT_TYPES[content_type]
    clean_filename = f"logo_{company.id[:8]}.{ext}"
    storage_path = f"companies/{company.id}/logo/{clean_filename}"
    bucket = getattr(settings, "QUOTATION_PDF_BUCKET", "quotations")
    storage = get_storage_service()

    try:
        storage.upload(
            bucket=bucket,
            path=storage_path,
            data=file_bytes,
            content_type=content_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store logo: {str(exc)}"
        )

    company.logo_url = storage_path
    db.commit()
    db.refresh(company)

    return {
        "message": "Company logo uploaded successfully.",
        "logo_url": storage_path,
    }


@router.delete("/logo")
def remove_company_logo(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove existing company logo from storage and reset company.logo_url."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if company.logo_url:
        storage = get_storage_service()
        bucket = getattr(settings, "QUOTATION_PDF_BUCKET", "quotations")
        try:
            storage.delete(bucket=bucket, path=company.logo_url)
        except Exception:
            pass
        company.logo_url = None
        db.commit()

    return {"message": "Company logo removed successfully."}

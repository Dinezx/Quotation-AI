from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field

# Baseline existing models (preserved for full backward compatibility)
class CompanyBase(BaseModel):
    name: str
    legal_name: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class CompanyResponse(CompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Modular Authoritative Company Settings Schemas ---

class CompanyProfileUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    authorized_signatory: Optional[str] = None


class CompanyProfileResponse(BaseModel):
    id: str
    name: str
    legal_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    authorized_signatory: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyTaxSettingsUpdate(BaseModel):
    gstin: Optional[str] = None
    gst_type: str = Field(default="CGST_SGST", description="CGST_SGST, IGST, or EXEMPT")
    default_gst_rate: Decimal = Field(default=Decimal("18.00"), ge=0, le=100)


class CompanyTaxSettingsResponse(BaseModel):
    gstin: Optional[str] = None
    gst_type: str = "CGST_SGST"
    default_gst_rate: Decimal = Decimal("18.00")


class CompanyBankSettingsUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    upi_id: Optional[str] = None


class CompanyBankSettingsResponse(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    upi_id: Optional[str] = None


class CompanyQuotationDefaultsUpdate(BaseModel):
    quotation_validity: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    inspection_terms: Optional[str] = None
    general_terms: Optional[str] = None
    prepared_by: Optional[str] = None
    authorized_signatory: Optional[str] = None


class CompanyQuotationDefaultsResponse(BaseModel):
    quotation_validity: Optional[str] = "30 Days from date of issue"
    payment_terms: Optional[str] = "30 Days from date of supply and inspection."
    delivery_terms: Optional[str] = "Ex-Works Factory Bhosari, Pune. Freight extra at actuals."
    inspection_terms: Optional[str] = "Pre-dispatch inspection at manufacturer works."
    general_terms: Optional[str] = "Dimensions as per drawing. Standard machining tolerances apply."
    prepared_by: Optional[str] = "Rajesh Deshmukh"
    authorized_signatory: Optional[str] = "Authorized Signatory"


class QuotationTemplateConfigBase(BaseModel):
    template_id: str = Field(default="classic_professional")
    primary_color: str = Field(default="#1e3a8a")
    secondary_color: str = Field(default="#64748b")
    font_family: str = Field(default="Helvetica") # Helvetica, Courier, Times-Roman
    logo_position: str = Field(default="left") # left, center, right
    show_logo: bool = True
    show_company_contact: bool = True
    show_gstin: bool = True
    show_bank_details: bool = True
    show_terms: bool = True
    show_signature: bool = True
    show_footer: bool = True
    footer_text: Optional[str] = "Quotation AI Engineering Quotation System | Authoritative Deterministic Costing"
    table_style: str = "grid" # grid, clean, striped, bordered


class QuotationTemplateConfigUpdate(BaseModel):
    template_id: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    font_family: Optional[str] = None
    logo_position: Optional[str] = None
    show_logo: Optional[bool] = None
    show_company_contact: Optional[bool] = None
    show_gstin: Optional[bool] = None
    show_bank_details: Optional[bool] = None
    show_terms: Optional[bool] = None
    show_signature: Optional[bool] = None
    show_footer: Optional[bool] = None
    footer_text: Optional[str] = None
    table_style: Optional[str] = None


class QuotationTemplateConfigResponse(QuotationTemplateConfigBase):
    pass


class TemplateGalleryItem(BaseModel):
    id: str
    name: str
    description: str
    category: str # Professional, Modern, Industrial, Minimal
    preview_accent: str
    features: List[str]
    default_primary_color: str
    default_secondary_color: str
    default_font: str = "Helvetica"


class CompanyFullSettingsResponse(BaseModel):
    profile: CompanyProfileResponse
    tax: CompanyTaxSettingsResponse
    bank: CompanyBankSettingsResponse
    defaults: CompanyQuotationDefaultsResponse
    template: QuotationTemplateConfigResponse
    logo_url: Optional[str] = None

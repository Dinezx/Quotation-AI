from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, JSON
from app.db.base import Base, TimestampMixin, generate_uuid

class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="company", cascade="all, delete-orphan")
    customers: Mapped[List["Customer"]] = relationship("Customer", back_populates="company", cascade="all, delete-orphan")
    materials: Mapped[List["Material"]] = relationship("Material", back_populates="company", cascade="all, delete-orphan")
    processes: Mapped[List["Process"]] = relationship("Process", back_populates="company", cascade="all, delete-orphan")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="company", cascade="all, delete-orphan")
    quotations: Mapped[List["Quotation"]] = relationship("Quotation", back_populates="company", cascade="all, delete-orphan")

    def get_profile_data(self) -> dict:
        profile = (self.settings or {}).get("profile", {}) if isinstance(self.settings, dict) else {}
        return {
            "id": self.id,
            "name": self.name,
            "legal_name": self.legal_name,
            "address": self.address,
            "city": profile.get("city"),
            "state": profile.get("state"),
            "pincode": profile.get("pincode"),
            "country": profile.get("country", "India"),
            "phone": self.phone,
            "email": self.email,
            "website": profile.get("website"),
            "gstin": self.gstin,
            "pan": profile.get("pan"),
            "authorized_signatory": profile.get("authorized_signatory"),
            "logo_url": self.logo_url,
        }

    def get_tax_settings(self) -> dict:
        s = self.settings if isinstance(self.settings, dict) else {}
        return {
            "gstin": self.gstin,
            "gst_type": str(s.get("gst_type", "CGST_SGST")),
            "default_gst_rate": s.get("default_gst_rate", "18.00"),
        }

    def get_bank_settings(self) -> dict:
        s = self.settings if isinstance(self.settings, dict) else {}
        bank = s.get("bank_details", {}) if isinstance(s.get("bank_details"), dict) else {}
        return {
            "bank_name": bank.get("bank_name") or s.get("bank_name"),
            "account_name": bank.get("account_name") or s.get("account_name") or self.legal_name or self.name,
            "account_number": bank.get("account_number") or s.get("bank_account") or s.get("account_number"),
            "ifsc": bank.get("ifsc") or s.get("bank_ifsc") or s.get("ifsc"),
            "branch": bank.get("branch") or s.get("bank_branch") or s.get("branch"),
            "upi_id": bank.get("upi_id") or s.get("upi_id"),
        }

    def get_quotation_defaults(self) -> dict:
        s = self.settings if isinstance(self.settings, dict) else {}
        defaults = s.get("quotation_defaults", {}) if isinstance(s.get("quotation_defaults"), dict) else {}
        return {
            "quotation_validity": defaults.get("quotation_validity", "30 Days from date of issue"),
            "payment_terms": defaults.get("payment_terms", "30 Days from date of supply and inspection."),
            "delivery_terms": defaults.get("delivery_terms", "Ex-Works Factory Bhosari, Pune. Freight extra at actuals."),
            "inspection_terms": defaults.get("inspection_terms", "Pre-dispatch inspection at manufacturer works."),
            "general_terms": defaults.get("general_terms", "Dimensions as per drawing. Standard machining tolerances apply."),
            "prepared_by": defaults.get("prepared_by", "Rajesh Deshmukh"),
            "authorized_signatory": defaults.get("authorized_signatory", "Authorized Signatory"),
        }

    def get_template_config(self) -> dict:
        s = self.settings if isinstance(self.settings, dict) else {}
        tmpl = s.get("quotation_template", {}) if isinstance(s.get("quotation_template"), dict) else {}
        return {
            "template_id": tmpl.get("template_id", "classic_professional"),
            "primary_color": tmpl.get("primary_color", "#1e3a8a"),
            "secondary_color": tmpl.get("secondary_color", "#64748b"),
            "font_family": tmpl.get("font_family", "Helvetica"),
            "logo_position": tmpl.get("logo_position", "left"),
            "show_logo": tmpl.get("show_logo", True),
            "show_company_contact": tmpl.get("show_company_contact", True),
            "show_gstin": tmpl.get("show_gstin", True),
            "show_bank_details": tmpl.get("show_bank_details", True),
            "show_terms": tmpl.get("show_terms", True),
            "show_signature": tmpl.get("show_signature", True),
            "show_footer": tmpl.get("show_footer", True),
            "footer_text": tmpl.get("footer_text", "Quotation AI Engineering Quotation System | Authoritative Deterministic Costing"),
            "table_style": tmpl.get("table_style", "grid"),
        }


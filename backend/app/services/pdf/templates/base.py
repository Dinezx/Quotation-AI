import io
import os
import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    Image as RLImage,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.models.quotation import Quotation
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.services.calculation.calculation_service import CalculationService

logger = logging.getLogger(__name__)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to compute total page count and draw running footers."""

    def __init__(self, *args, **kwargs):
        self.footer_text = kwargs.pop("footer_text", "Quotation AI Engineering Quotation System | Authoritative Costing")
        self.show_footer = kwargs.pop("show_footer", True)
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            if self.show_footer:
                self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 32, 555, 32)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(40, 22, self.footer_text)
        self.drawRightString(555, 22, page_str)
        self.restoreState()


class BaseQuotationTemplate:
    """Base class providing shared formatting, styles, and document assembly for all 8 templates."""

    def __init__(self, template_id: str, name: str):
        self.template_id = template_id
        self.name = name

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Assembles and renders binary PDF using template presentation rules."""
        raise NotImplementedError

    def get_color(self, hex_val: Optional[str], default_hex: str) -> colors.Color:
        val = hex_val or default_hex
        try:
            return colors.HexColor(val)
        except Exception:
            return colors.HexColor(default_hex)

    def get_font_name(self, font_family: Optional[str]) -> str:
        f = (font_family or "Helvetica").lower()
        if "courier" in f:
            return "Courier"
        if "times" in f:
            return "Times-Roman"
        return "Helvetica"

    def get_bold_font(self, font_name: str) -> str:
        if font_name == "Courier":
            return "Courier-Bold"
        if font_name == "Times-Roman":
            return "Times-Bold"
        return "Helvetica-Bold"

    def get_oblique_font(self, font_name: str) -> str:
        if font_name == "Courier":
            return "Courier-Oblique"
        if font_name == "Times-Roman":
            return "Times-Italic"
        return "Helvetica-Oblique"

    def format_date(self, dt: Optional[datetime], default: str = "N/A") -> str:
        return dt.strftime("%d-%b-%Y") if dt else default

    def format_currency(self, amount: Optional[Decimal]) -> str:
        val = amount if amount is not None else Decimal("0.00")
        return f"₹ {val:,.2f}"

    def get_amount_in_words(self, quotation: Quotation) -> str:
        total = int(quotation.final_total) if quotation.final_total else 0
        return CalculationService.number_to_indian_words(total)

    def get_company_logo_flowable(self, company: Company, max_width: int = 140, max_height: int = 48) -> Optional[RLImage]:
        """Safely loads company logo from local storage if present and valid."""
        if not company or not company.logo_url:
            return None

        # Check local storage or uploads path
        target_path = None
        if os.path.isabs(company.logo_url) and os.path.isfile(company.logo_url):
            target_path = company.logo_url
        else:
            # Check relative to backend/uploads
            from app.services.storage.storage_service import UPLOAD_DIR
            potential_paths = [
                os.path.join(UPLOAD_DIR, "storage", settings_bucket(company), company.logo_url.lstrip("/")),
                os.path.join(UPLOAD_DIR, company.logo_url.lstrip("/")),
                company.logo_url,
            ]
            for p in potential_paths:
                if os.path.isfile(p):
                    target_path = p
                    break

        if target_path:
            try:
                return RLImage(target_path, width=max_width, height=max_height, kind="proportional")
            except Exception as e:
                logger.warning("Failed to load company logo image flowable: %s", e)
                return None
        return None


def settings_bucket(company: Company) -> str:
    from app.core.config import settings
    return getattr(settings, "QUOTATION_PDF_BUCKET", "quotations")

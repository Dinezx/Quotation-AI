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

    def get_company_logo_flowable(
        self,
        company: Company,
        max_width: int = 140,
        max_height: int = 48,
        cfg: Optional[Dict[str, Any]] = None
    ) -> Optional[RLImage]:
        """Safely loads company logo from local storage or storage service if present and valid."""
        if cfg and cfg.get("show_logo") is False:
            return None

        if not company or not company.logo_url:
            return None

        import io
        from PIL import Image as PILImage, ImageFile
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        from app.services.storage.storage_service import UPLOAD_DIR, get_storage_service

        # 1. Check local storage or direct uploads path
        data: Optional[bytes] = None
        if os.path.isabs(company.logo_url) and os.path.isfile(company.logo_url):
            try:
                with open(company.logo_url, "rb") as f:
                    data = f.read()
            except Exception:
                pass
        else:
            potential_paths = [
                os.path.join(UPLOAD_DIR, "storage", settings_bucket(company), company.logo_url.lstrip("/")),
                os.path.join(UPLOAD_DIR, company.logo_url.lstrip("/")),
                company.logo_url,
            ]
            for p in potential_paths:
                if os.path.isfile(p):
                    try:
                        with open(p, "rb") as f:
                            data = f.read()
                        break
                    except Exception:
                        pass

        # 2. Try storage service download if not loaded from disk
        if not data:
            try:
                storage = get_storage_service()
                bucket = settings_bucket(company)
                data = storage.download(bucket=bucket, path=company.logo_url)
            except Exception as e:
                logger.warning("Failed to download company logo from storage service: %s", e)
                return None

        if not data:
            return None

        # 3. Validate image data with PIL to ensure it decodes cleanly without breaking document generation
        try:
            buf = io.BytesIO(data)
            pil_img = PILImage.open(buf)
            pil_img.load()
            buf.seek(0)
            return RLImage(buf, width=max_width, height=max_height, kind="proportional")
        except Exception as e:
            logger.warning("Failed to create valid flowable for company logo: %s", e)
            return None

    def build_header_logo_flowables(
        self,
        company: Company,
        cfg: Dict[str, Any],
        left_cell: Any,
        right_cell: Any,
        col_widths: List[int] = [315, 200],
        max_width: int = 140,
        max_height: int = 48,
        table_style: Optional[List[Any]] = None,
    ) -> List[Any]:
        """
        Builds ReportLab flowables for header respecting logo_position ('left', 'center', 'right')
        and show_logo flag with strict aspect-ratio preservation.
        """
        show_logo = cfg.get("show_logo", True)
        logo_pos = cfg.get("logo_position", "left").lower()
        logo_flowable = self.get_company_logo_flowable(company, max_width=max_width, max_height=max_height, cfg=cfg)

        flowables: List[Any] = []
        l_item = left_cell if isinstance(left_cell, list) else [left_cell]
        r_item = right_cell if isinstance(right_cell, list) else [right_cell]

        base_style = table_style if table_style is not None else [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]

        if not logo_flowable or not show_logo:
            # No logo or show_logo=False -> standard 2-column header
            tbl = Table([[l_item, r_item]], colWidths=col_widths)
            tbl.setStyle(TableStyle(base_style))
            flowables.append(tbl)
            return flowables

        # Logo is present
        if logo_pos == "center":
            center_style = [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
            if table_style:
                # Inherit background if specified
                for rule in table_style:
                    if rule[0] == "BACKGROUND":
                        center_style.append(rule)
            center_tbl = Table([[logo_flowable]], colWidths=[sum(col_widths)])
            center_tbl.setStyle(TableStyle(center_style))
            flowables.append(center_tbl)
            flowables.append(Spacer(1, 4))
            tbl = Table([[l_item, r_item]], colWidths=col_widths)
            tbl.setStyle(TableStyle(base_style))
            flowables.append(tbl)
        elif logo_pos == "right":
            r_combined = [logo_flowable, Spacer(1, 4)] + r_item
            tbl = Table([[l_item, r_combined]], colWidths=col_widths)
            tbl.setStyle(TableStyle(base_style + [("ALIGN", (1, 0), (1, -1), "RIGHT")]))
            flowables.append(tbl)
        else: # left
            l_combined = [logo_flowable, Spacer(1, 4)] + l_item
            tbl = Table([[l_combined, r_item]], colWidths=col_widths)
            tbl.setStyle(TableStyle(base_style))
            flowables.append(tbl)

        return flowables


def settings_bucket(company: Company) -> str:
    from app.core.config import settings
    return getattr(settings, "QUOTATION_PDF_BUCKET", "quotations")



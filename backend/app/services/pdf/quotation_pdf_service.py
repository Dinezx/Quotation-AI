"""
Presentation-only PDF Generation Service for Quotation AI.

CRITICAL ARCHITECTURE INVARIANT:
This service is strictly presentation-only. It NEVER calculates prices, never
applies markup/margins, never recalculates tax, and never alters numbers.
It formats and renders the already-calculated, persisted commercial values from
Quotation and QuotationItem records into a professional Indian manufacturing A4 PDF.
"""

from decimal import Decimal
import io
from typing import Optional, List, Dict, Any
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
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.models.quotation import Quotation
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.services.calculation.calculation_service import CalculationService


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to compute total page count and draw running footers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 32, 555, 32)

        # Footer notes
        footer_text = "Quotation AI Engineering Quotation System | Authoritative Deterministic Costing"
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(40, 22, footer_text)
        self.drawRightString(555, 22, page_str)
        self.restoreState()


class QuotationPDFService:
    """Renders industrial precision Quotation PDFs from persisted database records."""

    @classmethod
    def generate_quotation_pdf(
        cls,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
    ) -> bytes:
        """
        Generates binary PDF content for the given quotation.
        Presentation-only: reads and displays persisted values.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=40,
            rightMargin=40,
            topMargin=36,
            bottomMargin=42,
        )

        content = []
        styles = cls._create_styles()

        # 1. Company Header & Quotation Document Meta
        content.append(cls._build_header_section(quotation, company, styles))
        content.append(Spacer(1, 10))

        # 2. Customer & Purchase Order Reference Information Block
        content.append(cls._build_party_reference_section(quotation, customer, purchase_order, styles))
        content.append(Spacer(1, 10))

        # 3. Itemized Quotation Line Items Table
        content.append(cls._build_items_table(quotation, styles))
        content.append(Spacer(1, 8))

        # 4. Financial Cost Summary, Tax Breakdown, Bank Details & Amount in Words
        content.append(cls._build_commercial_summary_section(quotation, company, styles))
        content.append(Spacer(1, 10))

        # 5. Terms & Conditions and Authorization Signatures
        content.append(cls._build_terms_and_signatures(quotation, company, styles))

        doc.build(content, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @classmethod
    def _create_styles(cls) -> Dict[str, ParagraphStyle]:
        base = getSampleStyleSheet()
        return {
            "CompanyTitle": ParagraphStyle(
                "CompanyTitle",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=14,
                leading=16,
                textColor=colors.HexColor("#0f172a"),
            ),
            "CompanyMeta": ParagraphStyle(
                "CompanyMeta",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#334155"),
            ),
            "DocTitle": ParagraphStyle(
                "DocTitle",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=18,
                leading=20,
                alignment=2,  # Right
                textColor=colors.HexColor("#0f172a"),
            ),
            "DocMeta": ParagraphStyle(
                "DocMeta",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8.5,
                leading=12,
                alignment=2,  # Right
                textColor=colors.HexColor("#334155"),
            ),
            "SectionHeader": ParagraphStyle(
                "SectionHeader",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#0f172a"),
                textTransform="uppercase",
            ),
            "BodySmall": ParagraphStyle(
                "BodySmall",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#1e293b"),
            ),
            "BodySmallBold": ParagraphStyle(
                "BodySmallBold",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#0f172a"),
            ),
            "MonoCell": ParagraphStyle(
                "MonoCell",
                parent=base["Normal"],
                fontName="Courier",
                fontSize=7.5,
                leading=9.5,
                textColor=colors.HexColor("#0f172a"),
            ),
            "MonoCellRight": ParagraphStyle(
                "MonoCellRight",
                parent=base["Normal"],
                fontName="Courier",
                fontSize=8,
                leading=10,
                alignment=2,  # Right
                textColor=colors.HexColor("#0f172a"),
            ),
            "TableHeader": ParagraphStyle(
                "TableHeader",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=9.5,
                alignment=1,  # Center
                textColor=colors.white,
            ),
            "GrandTotalLabel": ParagraphStyle(
                "GrandTotalLabel",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=12,
                textColor=colors.white,
            ),
            "GrandTotalVal": ParagraphStyle(
                "GrandTotalVal",
                parent=base["Normal"],
                fontName="Courier-Bold",
                fontSize=11,
                leading=13,
                alignment=2,
                textColor=colors.white,
            ),
            "AmountInWords": ParagraphStyle(
                "AmountInWords",
                parent=base["Normal"],
                fontName="Helvetica-Oblique",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#1e293b"),
            ),
            "TermsTitle": ParagraphStyle(
                "TermsTitle",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#0f172a"),
            ),
            "TermsItem": ParagraphStyle(
                "TermsItem",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=7.5,
                leading=10.5,
                textColor=colors.HexColor("#334155"),
            ),
        }

    @classmethod
    def _build_header_section(
        cls,
        quotation: Quotation,
        company: Company,
        styles: Dict[str, ParagraphStyle]
    ) -> Table:
        # Left column: Company info
        comp_lines = [
            f"<b>{company.name}</b>",
        ]
        if company.legal_name and company.legal_name != company.name:
            comp_lines.append(f"<font color='#64748b'>({company.legal_name})</font>")
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))
        contact_line = []
        if company.phone:
            contact_line.append(f"Phone: {company.phone}")
        if company.email:
            contact_line.append(f"Email: {company.email}")
        if contact_line:
            comp_lines.append(" | ".join(contact_line))
        if company.gstin:
            comp_lines.append(f"<b>GSTIN:</b> <font face='Courier'><b>{company.gstin}</b></font>")

        left_para = Paragraph("<br/>".join(comp_lines), styles["CompanyMeta"])

        # Right column: Quotation document metadata
        status_badge = f"<font color='{'#059669' if quotation.status == 'FINAL' else '#2563eb'}'><b>[{quotation.status}]</b></font>"
        q_date_str = quotation.quotation_date.strftime("%d-%b-%Y") if quotation.quotation_date else "N/A"
        valid_until_str = quotation.valid_until.strftime("%d-%b-%Y") if quotation.valid_until else "30 Days from date of issue"

        right_lines = [
            f"<font size=18><b>QUOTATION</b></font>  {status_badge}",
            f"Quotation No: <b><font face='Courier'>{quotation.quotation_number}</font></b>",
            f"Date: <b><font face='Courier'>{q_date_str}</font></b>",
            f"Validity: <b><font face='Courier'>{valid_until_str}</font></b>",
            f"Currency: <b><font face='Courier'>{quotation.currency or 'INR'}</font></b>",
        ]
        right_para = Paragraph("<br/>".join(right_lines), styles["DocMeta"])

        tbl = Table([[left_para, right_para]], colWidths=[310, 205])
        tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return tbl

    @classmethod
    def _build_party_reference_section(
        cls,
        quotation: Quotation,
        customer: Optional[Customer],
        purchase_order: Optional[PurchaseOrder],
        styles: Dict[str, ParagraphStyle]
    ) -> Table:
        # Customer Box
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Customer")
        cust_addr = (
            customer.billing_address or customer.shipping_address or "Not Provided"
        ) if customer else "Not Provided"
        cust_gstin = customer.gstin if customer and customer.gstin else "Unregistered / N/A"

        customer_box_content = [
            Paragraph("<b>QUOTATION TO:</b>", styles["SectionHeader"]),
            Spacer(1, 2),
            Paragraph(f"<b>{cust_name}</b>", styles["BodySmallBold"]),
            Paragraph(f"Address: {cust_addr}", styles["BodySmall"]),
            Paragraph(f"Customer GSTIN: <font face='Courier'><b>{cust_gstin}</b></font>", styles["BodySmall"]),
        ]

        # Order / Reference Box
        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = purchase_order.po_date.strftime("%d-%b-%Y") if (purchase_order and purchase_order.po_date) else "N/A"
        prepared_by = quotation.prepared_by or "Costing Engineering Department"

        reference_box_content = [
            Paragraph("<b>ORDER REFERENCE:</b>", styles["SectionHeader"]),
            Spacer(1, 2),
            Paragraph(f"Purchase Order No: <font face='Courier'><b>{po_num}</b></font>", styles["BodySmall"]),
            Paragraph(f"PO Date: <font face='Courier'>{po_date}</font>", styles["BodySmall"]),
            Paragraph(f"Prepared By: <b>{prepared_by}</b>", styles["BodySmall"]),
        ]

        data = [[customer_box_content, reference_box_content]]
        table = Table(data, colWidths=[270, 245])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#cbd5e1")),
            ("BOX", (1, 0), (1, 0), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return table

    @classmethod
    def _build_items_table(
        cls,
        quotation: Quotation,
        styles: Dict[str, ParagraphStyle]
    ) -> Table:
        # Table columns:
        # # (20), Part Name & Spec (145), Drawing (60), Material (55), Process (60), Qty (35), Unit (30), Rate (55), Total (55)
        # Total = 515 pt
        headers = [
            Paragraph("<b>#</b>", styles["TableHeader"]),
            Paragraph("<b>Part Description & Spec</b>", styles["TableHeader"]),
            Paragraph("<b>Drawing No.</b>", styles["TableHeader"]),
            Paragraph("<b>Material</b>", styles["TableHeader"]),
            Paragraph("<b>Process</b>", styles["TableHeader"]),
            Paragraph("<b>Qty</b>", styles["TableHeader"]),
            Paragraph("<b>Unit</b>", styles["TableHeader"]),
            Paragraph("<b>Unit Price (₹)</b>", styles["TableHeader"]),
            Paragraph("<b>Total Price (₹)</b>", styles["TableHeader"]),
        ]

        table_data = [headers]

        sorted_items = sorted(quotation.items, key=lambda it: it.item_number or 0)
        for idx, it in enumerate(sorted_items):
            desc_lines = [f"<b>{it.part_name}</b>"]
            if it.specification:
                desc_lines.append(f"<font color='#64748b'>{it.specification}</font>")
            desc_p = Paragraph("<br/>".join(desc_lines), styles["BodySmall"])

            drw_p = Paragraph(it.drawing_number or "-", styles["MonoCell"])
            mat_p = Paragraph(it.material or "-", styles["BodySmall"])
            prc_p = Paragraph(it.process or "-", styles["BodySmall"])
            qty_p = Paragraph(f"{it.quantity:,.0f}" if it.quantity % 1 == 0 else f"{it.quantity:,.2f}", styles["MonoCell"])
            unit_p = Paragraph(it.unit or "PCS", styles["BodySmall"])

            rate_str = f"{it.unit_price:,.2f}"
            tot_str = f"{it.total_price:,.2f}"
            rate_p = Paragraph(rate_str, styles["MonoCellRight"])
            tot_p = Paragraph(tot_str, styles["MonoCellRight"])

            row_num_p = Paragraph(str(it.item_number or (idx + 1)), styles["MonoCell"])

            table_data.append([
                row_num_p,
                desc_p,
                drw_p,
                mat_p,
                prc_p,
                qty_p,
                unit_p,
                rate_p,
                tot_p,
            ])

        col_widths = [20, 145, 60, 55, 60, 35, 30, 55, 55]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)

        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]

        # Alternating row colors
        for r_idx in range(1, len(table_data)):
            if r_idx % 2 == 0:
                t_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc")))

        t.setStyle(TableStyle(t_style))
        return t

    @classmethod
    def _build_commercial_summary_section(
        cls,
        quotation: Quotation,
        company: Company,
        styles: Dict[str, ParagraphStyle]
    ) -> KeepTogether:
        # Left Panel: Bank Details + Amount in Words
        bank_settings = company.settings if isinstance(company.settings, dict) else {}
        bank_name = bank_settings.get("bank_name")
        bank_branch = bank_settings.get("bank_branch")
        bank_account = bank_settings.get("bank_account")
        bank_ifsc = bank_settings.get("bank_ifsc")
        upi_id = bank_settings.get("upi_id")

        left_elements = []

        # Amount in Words (Indian Rupee Standard)
        amount_in_words = CalculationService.number_to_indian_words(int(quotation.final_total))
        left_elements.append(Paragraph("<b>AMOUNT IN WORDS (INR):</b>", styles["SectionHeader"]))
        left_elements.append(Spacer(1, 2))
        left_elements.append(Paragraph(f"<b>{amount_in_words}</b>", styles["AmountInWords"]))
        left_elements.append(Spacer(1, 8))

        # Bank Remittance Block
        if bank_name and bank_account and bank_ifsc:
            left_elements.append(Paragraph("<b>BANK REMITTANCE DETAILS:</b>", styles["SectionHeader"]))
            left_elements.append(Spacer(1, 2))
            bank_info_lines = [
                f"Bank Name: <b>{bank_name}</b>",
                f"Branch: {bank_branch or 'Main Branch'}",
                f"Account No: <b><font face='Courier'>{bank_account}</font></b>",
                f"IFSC Code: <b><font face='Courier'>{bank_ifsc}</font></b>",
            ]
            if upi_id:
                bank_info_lines.append(f"UPI ID: <font face='Courier'>{upi_id}</font>")
            left_elements.append(Paragraph("<br/>".join(bank_info_lines), styles["BodySmall"]))

        # Right Panel: Financial & Tax Breakdown
        # Direct read from database - NO calculations performed here
        calc_rows = [
            ("Material Cost", f"₹ {quotation.material_cost:,.2f}"),
            ("Process Cost", f"₹ {quotation.process_cost:,.2f}"),
            ("Manufacturing Subtotal", f"₹ {quotation.subtotal:,.2f}"),
            (f"Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            ("Assessable Value", f"₹ {(quotation.subtotal + quotation.overhead_amount):,.2f}"),
            (f"Profit Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Taxable Value", f"₹ {quotation.taxable_amount:,.2f}"),
        ]

        if quotation.gst_type == "IGST":
            calc_rows.append((f"Integrated GST (IGST {quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"Central GST (CGST {quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"State GST (SGST {quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_table_rows = []
        for label, val in calc_rows:
            is_sub = "Subtotal" in label or "Taxable" in label
            label_p = Paragraph(f"<b>{label}</b>" if is_sub else label, styles["BodySmall"])
            val_p = Paragraph(f"<b>{val}</b>" if is_sub else val, styles["MonoCellRight"])
            summary_table_rows.append([label_p, val_p])

        # Grand Total Highlight Row
        gt_label = Paragraph("<b>GRAND TOTAL (INR)</b>", styles["GrandTotalLabel"])
        gt_val = Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", styles["GrandTotalVal"])
        summary_table_rows.append([gt_label, gt_val])

        breakdown_table = Table(summary_table_rows, colWidths=[150, 95])
        b_style = [
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 2), (1, 2), 0.5, colors.HexColor("#cbd5e1")),  # Subtotal
            ("LINEBELOW", (0, 6), (1, 6), 0.5, colors.HexColor("#cbd5e1")),  # Taxable
            ("BACKGROUND", (0, -1), (1, -1), colors.HexColor("#0f172a")),     # Grand total bar
            ("TOPPADDING", (0, -1), (1, -1), 5),
            ("BOTTOMPADDING", (0, -1), (1, -1), 5),
        ]
        breakdown_table.setStyle(TableStyle(b_style))

        # Combine Left elements and Right Breakdown
        container_table = Table([[left_elements, breakdown_table]], colWidths=[265, 250])
        container_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        return KeepTogether([container_table])

    @classmethod
    def _build_terms_and_signatures(
        cls,
        quotation: Quotation,
        company: Company,
        styles: Dict[str, ParagraphStyle]
    ) -> KeepTogether:
        # Commercial Terms
        delivery = quotation.delivery_terms or "Ex-Works Factory Bhosari, Pune. Freight extra at actuals."
        payment = quotation.payment_terms or "30 Days from date of supply and inspection."
        inspection = quotation.inspection_terms or "Pre-dispatch inspection at manufacturer works."
        notes = quotation.notes or "Dimensions as per drawing. Standard machining tolerances apply."

        terms_lines = [
            Paragraph("<b>COMMERCIAL TERMS & CONDITIONS:</b>", styles["TermsTitle"]),
            Spacer(1, 2),
            Paragraph(f"1. <b>Delivery Terms:</b> {delivery}", styles["TermsItem"]),
            Paragraph(f"2. <b>Payment Terms:</b> {payment}", styles["TermsItem"]),
            Paragraph(f"3. <b>Inspection:</b> {inspection}", styles["TermsItem"]),
            Paragraph(f"4. <b>General Notes:</b> {notes}", styles["TermsItem"]),
        ]

        # Signatures Area
        prep_by = quotation.prepared_by or "Rajesh Deshmukh"
        auth_sig = quotation.authorized_signatory or "Authorized Signatory"

        sig_data = [
            [
                Paragraph(f"<b>Prepared By:</b><br/>{prep_by}<br/><font color='#64748b'>Costing Engineering</font>", styles["BodySmall"]),
                Paragraph(f"<b>For {company.name}</b><br/><br/><br/>___________________________<br/><b>{auth_sig}</b><br/><font color='#64748b'>Authorized Signatory</font>", styles["BodySmall"]),
            ]
        ]
        sig_table = Table(sig_data, colWidths=[250, 265])
        sig_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))

        return KeepTogether([
            Table([[terms_lines]], colWidths=[515], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]),
            Spacer(1, 8),
            sig_table
        ])

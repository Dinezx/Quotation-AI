import io
from typing import Optional, Dict, Any
from decimal import Decimal

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

from app.models.quotation import Quotation
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.services.pdf.templates.base import BaseQuotationTemplate, NumberedCanvas


class ModernMinimalTemplate(BaseQuotationTemplate):
    """
    Template 2: Modern Minimal
    Spacious white space, clean typography, minimal visual weight, light line dividers,
    compact metadata blocks, understated clean table with subtle border lines.
    """

    def __init__(self):
        super().__init__("modern_minimal", "Modern Minimal")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#0f172a")
        secondary = self.get_color(cfg.get("secondary_color"), "#64748b")
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=44,
            rightMargin=44,
            topMargin=40,
            bottomMargin=42,
        )

        content = []
        base = getSampleStyleSheet()

        # Styles
        style_comp_title = ParagraphStyle("MM_CompTitle", parent=base["Normal"], fontName=bold_font, fontSize=16, leading=18, textColor=primary)
        style_comp_sub = ParagraphStyle("MM_CompSub", parent=base["Normal"], fontName=font, fontSize=8, leading=12, textColor=secondary)
        style_doc_badge = ParagraphStyle("MM_DocBadge", parent=base["Normal"], fontName=bold_font, fontSize=14, leading=16, alignment=2, textColor=primary)
        style_meta = ParagraphStyle("MM_Meta", parent=base["Normal"], fontName=font, fontSize=8, leading=12, alignment=2, textColor=colors.HexColor("#475569"))
        style_label = ParagraphStyle("MM_Label", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, textColor=secondary, textTransform="uppercase")
        style_text = ParagraphStyle("MM_Text", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"))
        style_tbl_hdr = ParagraphStyle("MM_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, textColor=colors.HexColor("#334155"))
        style_mono = ParagraphStyle("MM_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        style_mono_right = ParagraphStyle("MM_MonoRight", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Header (Minimalist split)
        comp_lines = [f"<b>{company.name}</b>"]
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))
        if cfg.get("show_company_contact", True):
            contacts = []
            if company.phone: contacts.append(company.phone)
            if company.email: contacts.append(company.email)
            if contacts: comp_lines.append(" • ".join(contacts))
        if cfg.get("show_gstin", True) and company.gstin:
            comp_lines.append(f"GSTIN: <font face='Courier'><b>{company.gstin}</b></font>")

        left_p = Paragraph("<br/>".join(comp_lines), style_comp_sub)

        q_date_str = self.format_date(quotation.quotation_date)
        valid_until_str = self.format_date(quotation.valid_until, "30 Days")
        right_lines = [
            f"<b>ESTIMATE / QUOTE</b>",
            f"<b>{quotation.quotation_number}</b>",
            f"Date: {q_date_str}",
            f"Valid Until: {valid_until_str}",
            f"Status: <b>{quotation.status}</b>"
        ]
        right_p = Paragraph("<br/>".join(right_lines), style_meta)

        header_tbl = Table([[left_p, right_p]], colWidths=[315, 192])
        header_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(header_tbl)
        content.append(Spacer(1, 10))
        content.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#e2e8f0"), spaceAfter=10))

        # 2. Party Information (Compact columns)
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Client")
        cust_addr = (customer.billing_address or customer.shipping_address or "") if customer else ""
        cust_gstin = customer.gstin if customer and customer.gstin else "N/A"

        c_box = [
            Paragraph("BILLED TO", style_label),
            Spacer(1, 1),
            Paragraph(f"<b>{cust_name}</b>", style_text),
            Paragraph(cust_addr, style_comp_sub),
            Paragraph(f"GSTIN: {cust_gstin}", style_comp_sub),
        ]

        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = self.format_date(purchase_order.po_date if purchase_order else None)
        ref_box = [
            Paragraph("REFERENCE", style_label),
            Spacer(1, 1),
            Paragraph(f"PO Number: <b>{po_num}</b>", style_text),
            Paragraph(f"PO Date: {po_date}", style_comp_sub),
            Paragraph(f"Prepared by: {quotation.prepared_by or 'Commercial Desk'}", style_comp_sub),
        ]

        party_tbl = Table([[c_box, ref_box]], colWidths=[290, 217])
        party_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(party_tbl)
        content.append(Spacer(1, 12))

        # 3. Item Table (Clean horizontal lines)
        headers = [
            Paragraph("<b>#</b>", style_tbl_hdr),
            Paragraph("<b>Description</b>", style_tbl_hdr),
            Paragraph("<b>Drawing</b>", style_tbl_hdr),
            Paragraph("<b>Material</b>", style_tbl_hdr),
            Paragraph("<b>Process</b>", style_tbl_hdr),
            Paragraph("<b>Qty</b>", style_tbl_hdr),
            Paragraph("<b>Rate (₹)</b>", style_tbl_hdr),
            Paragraph("<b>Total (₹)</b>", style_tbl_hdr),
        ]
        table_data = [headers]

        sorted_items = sorted(quotation.items, key=lambda it: it.item_number or 0)
        for idx, it in enumerate(sorted_items):
            desc_lines = [f"<b>{it.part_name}</b>"]
            if it.specification:
                desc_lines.append(f"<font color='#64748b'>{it.specification}</font>")
            desc_p = Paragraph("<br/>".join(desc_lines), style_text)

            drw_p = Paragraph(it.drawing_number or "-", style_mono)
            mat_p = Paragraph(it.material or "-", style_text)
            prc_p = Paragraph(it.process or "-", style_text)
            qty_p = Paragraph(f"{it.quantity:g} {it.unit or 'PCS'}", style_mono)
            rate_p = Paragraph(f"{it.unit_price:,.2f}", style_mono_right)
            tot_p = Paragraph(f"{it.total_price:,.2f}", style_mono_right)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), style_mono)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, rate_p, tot_p])

        col_widths = [20, 165, 60, 60, 60, 45, 47, 50]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, 0), 1, primary),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ]))
        content.append(items_tbl)
        content.append(Spacer(1, 10))

        # 4. Summary & Bank Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("AMOUNT IN WORDS", style_label))
        left_box.append(Spacer(1, 1))
        left_box.append(Paragraph(f"<i>{words}</i>", style_text))
        left_box.append(Spacer(1, 10))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("BANK DETAILS", style_label))
                left_box.append(Spacer(1, 1))
                b_lines = [
                    f"{b_name} ({bank_s.get('branch') or 'Main'})",
                    f"A/C: <font face='Courier'><b>{bank_s.get('account_number')}</b></font>",
                    f"IFSC: <font face='Courier'><b>{bank_s.get('ifsc')}</b></font>",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), style_comp_sub))

        calc_rows = [
            ("Manufacturing Subtotal", f"₹ {quotation.subtotal:,.2f}"),
            (f"Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            (f"Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Taxable Total", f"₹ {quotation.taxable_amount:,.2f}"),
        ]
        if quotation.gst_type == "IGST":
            calc_rows.append((f"IGST ({quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"CGST ({quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"SGST ({quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_rows = []
        for label, val in calc_rows:
            summary_rows.append([
                Paragraph(label, style_comp_sub),
                Paragraph(val, style_mono_right)
            ])
        summary_rows.append([
            Paragraph("<b>Total Payable (INR)</b>", ParagraphStyle("MM_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=primary)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("MM_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=primary))
        ])

        summary_tbl = Table(summary_rows, colWidths=[130, 95])
        summary_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, -2), (-1, -2), 0.5, colors.HexColor("#cbd5e1")),
            ("LINEBELOW", (0, -1), (-1, -1), 1.5, primary),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        comm_tbl = Table([[left_box, summary_tbl]], colWidths=[282, 225])
        comm_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(KeepTogether([comm_tbl]))
        content.append(Spacer(1, 10))

        # 5. Terms & Signature
        terms_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                Paragraph("TERMS & CONDITIONS", style_label),
                Spacer(1, 1),
                Paragraph(f"1. Delivery: {quotation.delivery_terms or 'Standard ex-works'}", style_comp_sub),
                Paragraph(f"2. Payment: {quotation.payment_terms or '30 Days credit'}", style_comp_sub),
                Paragraph(f"3. Inspection: {quotation.inspection_terms or 'Pre-dispatch at works'}", style_comp_sub),
            ]
            terms_elements.append(Paragraph("<br/>".join([
                f"1. Delivery: {quotation.delivery_terms or 'Ex-works'}",
                f"2. Payment: {quotation.payment_terms or '30 Days'}",
                f"3. Inspection: {quotation.inspection_terms or 'Standard Pre-dispatch'}",
            ]), style_comp_sub))

        if cfg.get("show_signature", True):
            sig_table = Table([[
                Paragraph(f"Prepared by: <b>{quotation.prepared_by or 'Engineering Desk'}</b>", style_comp_sub),
                Paragraph(f"Authorized by: <b>{quotation.authorized_signatory or company.name}</b>", ParagraphStyle("MM_SigR", parent=base["Normal"], fontName=font, fontSize=8, alignment=2, textColor=secondary))
            ]], colWidths=[250, 257])
            sig_table.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            terms_elements.append(sig_table)

        if terms_elements:
            content.append(KeepTogether(terms_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI | Precision Manufacturing Quotation"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

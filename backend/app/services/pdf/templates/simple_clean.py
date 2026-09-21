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


class SimpleCleanTemplate(BaseQuotationTemplate):
    """
    Template 8: Simple Clean
    No unnecessary ornamentation, clean light table headers, clear line-item descriptions,
    straightforward financial tabulation, crisp clean footer.
    """

    def __init__(self):
        super().__init__("simple_clean", "Simple Clean")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#334155")
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=40,
            rightMargin=40,
            topMargin=36,
            bottomMargin=40,
        )

        content = []
        base = getSampleStyleSheet()

        style_comp = ParagraphStyle("SC_Comp", parent=base["Normal"], fontName=bold_font, fontSize=13, leading=15, textColor=colors.HexColor("#0f172a"))
        style_sub = ParagraphStyle("SC_Sub", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#475569"))
        style_quote_r = ParagraphStyle("SC_QuoteR", parent=base["Normal"], fontName=font, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#334155"))
        style_lbl = ParagraphStyle("SC_Lbl", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, textColor=colors.HexColor("#64748b"), textTransform="uppercase")
        style_text = ParagraphStyle("SC_Text", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"))
        style_tbl_hdr = ParagraphStyle("SC_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, textColor=colors.HexColor("#1e293b"))
        style_mono = ParagraphStyle("SC_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        style_mono_r = ParagraphStyle("SC_MonoR", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Simple Clean Header
        comp_lines = [
            f"<b>{company.name}</b>",
        ]
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))
        if cfg.get("show_company_contact", True):
            con = []
            if company.phone: con.append(f"Phone: {company.phone}")
            if company.email: con.append(f"Email: {company.email}")
            if con: comp_lines.append(" | ".join(con))
        if cfg.get("show_gstin", True) and company.gstin:
            comp_lines.append(f"GSTIN: {company.gstin}")

        left_p = Paragraph("<br/>".join(comp_lines), style_sub)

        q_date = self.format_date(quotation.quotation_date)
        v_date = self.format_date(quotation.valid_until, "30 Days")
        right_lines = [
            f"<font size=14><b>QUOTATION</b></font>",
            f"Number: <b>{quotation.quotation_number}</b>",
            f"Date: {q_date}",
            f"Validity: {v_date}",
        ]
        right_p = Paragraph("<br/>".join(right_lines), style_quote_r)

        hdr_tbl = Table([[left_p, right_p]], colWidths=[315, 200])
        hdr_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(hdr_tbl)
        content.append(Spacer(1, 8))
        content.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

        # 2. To & Reference Information
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Customer")
        cust_addr = (customer.billing_address or customer.shipping_address or "") if customer else ""
        cust_gstin = customer.gstin if customer and customer.gstin else "N/A"
        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")

        c_box = [
            Paragraph("CUSTOMER", style_lbl),
            Spacer(1, 1),
            Paragraph(f"<b>{cust_name}</b>", style_text),
            Paragraph(cust_addr, style_sub),
            Paragraph(f"GSTIN: {cust_gstin}", style_sub),
        ]

        r_box = [
            Paragraph("REFERENCE", style_lbl),
            Spacer(1, 1),
            Paragraph(f"PO Number: <b>{po_num}</b>", style_text),
            Paragraph(f"PO Date: {self.format_date(purchase_order.po_date if purchase_order else None)}", style_sub),
            Paragraph(f"Prepared by: {quotation.prepared_by or 'Commercial Desk'}", style_sub),
        ]

        ref_tbl = Table([[c_box, r_box]], colWidths=[270, 245])
        ref_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(ref_tbl)
        content.append(Spacer(1, 10))

        # 3. Simple Item Table
        headers = [
            Paragraph("<b>#</b>", style_tbl_hdr),
            Paragraph("<b>Item Description</b>", style_tbl_hdr),
            Paragraph("<b>Drawing No.</b>", style_tbl_hdr),
            Paragraph("<b>Material</b>", style_tbl_hdr),
            Paragraph("<b>Process</b>", style_tbl_hdr),
            Paragraph("<b>Qty</b>", style_tbl_hdr),
            Paragraph("<b>Unit Price (₹)</b>", style_tbl_hdr),
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
            rate_p = Paragraph(f"{it.unit_price:,.2f}", style_mono_r)
            tot_p = Paragraph(f"{it.total_price:,.2f}", style_mono_r)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), style_mono)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, rate_p, tot_p])

        col_widths = [20, 175, 60, 60, 60, 40, 50, 50]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#0f172a")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ]))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 4. Summary & Bank Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("AMOUNT IN WORDS", style_lbl))
        left_box.append(Spacer(1, 1))
        left_box.append(Paragraph(words, style_text))
        left_box.append(Spacer(1, 6))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("BANK DETAILS", style_lbl))
                left_box.append(Spacer(1, 1))
                b_lines = [
                    f"{b_name} ({bank_s.get('branch') or 'Main'})",
                    f"A/C: {bank_s.get('account_number')} | IFSC: {bank_s.get('ifsc')}",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), style_sub))

        calc_rows = [
            ("Manufacturing Subtotal", f"₹ {quotation.subtotal:,.2f}"),
            (f"Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            (f"Profit Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Taxable Value", f"₹ {quotation.taxable_amount:,.2f}"),
        ]
        if quotation.gst_type == "IGST":
            calc_rows.append((f"IGST ({quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"CGST ({quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"SGST ({quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_rows = []
        for label, val in calc_rows:
            summary_rows.append([Paragraph(label, style_sub), Paragraph(val, style_mono_r)])
        summary_rows.append([
            Paragraph("<b>Total (INR)</b>", ParagraphStyle("SC_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=colors.HexColor("#0f172a"))),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("SC_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=colors.HexColor("#0f172a")))
        ])

        summary_tbl = Table(summary_rows, colWidths=[135, 95])
        summary_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, -2), (-1, -2), 0.5, colors.HexColor("#cbd5e1")),
            ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#0f172a")),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        comm_tbl = Table([[left_box, summary_tbl]], colWidths=[285, 230])
        comm_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(KeepTogether([comm_tbl]))
        content.append(Spacer(1, 8))

        # 5. Terms & Signatures
        terms_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                f"1. Delivery: {quotation.delivery_terms or 'Ex-works'}",
                f"2. Payment: {quotation.payment_terms or '30 Days credit'}",
                f"3. Inspection: {quotation.inspection_terms or 'Pre-dispatch'}",
            ]
            terms_elements.append(Paragraph("<br/>".join(terms_lines), style_sub))

        if cfg.get("show_signature", True):
            sig_tbl = Table([[
                Paragraph(f"Prepared by: {quotation.prepared_by or 'Engineering Dept'}", style_sub),
                Paragraph(f"Authorized by: <b>{quotation.authorized_signatory or company.name}</b>", ParagraphStyle("SC_SigR", parent=base["Normal"], fontName=font, fontSize=8, alignment=2, textColor=colors.HexColor("#334155")))
            ]], colWidths=[255, 260])
            sig_tbl.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            terms_elements.append(sig_tbl)

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

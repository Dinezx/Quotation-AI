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
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.quotation import Quotation
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.services.pdf.templates.base import BaseQuotationTemplate, NumberedCanvas


class CreativeModernTemplate(BaseQuotationTemplate):
    """
    Template 7: Creative Modern
    Visually distinctive commercial layout utilizing deep teal/emerald accents,
    rounded card styling, elegant badge headings, and stylized section dividers.
    """

    def __init__(self):
        super().__init__("creative_modern", "Creative Modern")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#0f766e") # Deep Teal
        accent = self.get_color(cfg.get("secondary_color"), "#0284c7") # Cyan Accent
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=38,
            rightMargin=38,
            topMargin=32,
            bottomMargin=36,
        )

        content = []
        base = getSampleStyleSheet()

        # Styles
        style_comp_title = ParagraphStyle("CM_CompTitle", parent=base["Normal"], fontName=bold_font, fontSize=15, leading=17, textColor=primary)
        style_comp_meta = ParagraphStyle("CM_CompMeta", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#475569"))
        style_quote_badge = ParagraphStyle("CM_QuoteBadge", parent=base["Normal"], fontName=bold_font, fontSize=16, leading=18, alignment=2, textColor=primary)
        style_quote_meta = ParagraphStyle("CM_QuoteMeta", parent=base["Normal"], fontName=font, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#334155"))
        style_sec_title = ParagraphStyle("CM_SecTitle", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=10, textColor=primary, textTransform="uppercase")
        style_body = ParagraphStyle("CM_Body", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"))
        style_body_bold = ParagraphStyle("CM_BodyB", parent=base["Normal"], fontName=bold_font, fontSize=8.5, leading=11, textColor=colors.HexColor("#0f172a"))
        style_tbl_hdr = ParagraphStyle("CM_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, alignment=1, textColor=colors.white)
        style_mono = ParagraphStyle("CM_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        style_mono_r = ParagraphStyle("CM_MonoR", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Header with Teal Accent Bar
        comp_lines = [
            f"<font size=14><b>{company.name}</b></font>",
        ]
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))
        if cfg.get("show_company_contact", True):
            con = []
            if company.phone: con.append(f"T: {company.phone}")
            if company.email: con.append(f"E: {company.email}")
            if con: comp_lines.append(" | ".join(con))
        if cfg.get("show_gstin", True) and company.gstin:
            comp_lines.append(f"GSTIN: <font face='Courier'><b>{company.gstin}</b></font>")

        left_p = Paragraph("<br/>".join(comp_lines), style_comp_meta)

        q_date = self.format_date(quotation.quotation_date)
        v_date = self.format_date(quotation.valid_until, "30 Days")
        right_lines = [
            f"<font size=16><b>QUOTATION</b></font>",
            f"REF: <b><font face='Courier'>{quotation.quotation_number}</font></b>",
            f"DATE: {q_date}",
            f"VALIDITY: {v_date}",
            f"STATUS: <font color='{primary.hexval()}'><b>[{quotation.status}]</b></font>"
        ]
        right_p = Paragraph("<br/>".join(right_lines), style_quote_meta)

        header_tbl = Table([[left_p, right_p]], colWidths=[319, 200])
        header_tbl.setStyle(TableStyle([
            ("LINEAFTER", (0, 0), (0, 0), 2, primary),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (0, 0), 0),
            ("RIGHTPADDING", (0, 0), (0, 0), 10),
            ("LEFTPADDING", (1, 0), (1, 0), 10),
            ("RIGHTPADDING", (1, 0), (1, 0), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(header_tbl)
        content.append(Spacer(1, 10))

        # 2. Customer & Reference Cards
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Client")
        cust_addr = (customer.billing_address or customer.shipping_address or "Not Provided") if customer else "Not Provided"
        cust_gstin = customer.gstin if customer and customer.gstin else "Unregistered"

        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = self.format_date(purchase_order.po_date if purchase_order else None)

        c_box = [
            Paragraph("PROSPECTIVE CLIENT", style_sec_title),
            Spacer(1, 2),
            Paragraph(f"<b>{cust_name}</b>", style_body_bold),
            Paragraph(f"Address: {cust_addr}", style_body),
            Paragraph(f"GSTIN: <font face='Courier'><b>{cust_gstin}</b></font>", style_body),
        ]

        r_box = [
            Paragraph("PROJECT & PO AUDIT", style_sec_title),
            Spacer(1, 2),
            Paragraph(f"Purchase Order: <font face='Courier'><b>{po_num}</b></font>", style_body),
            Paragraph(f"Date: <font face='Courier'>{po_date}</font>", style_body),
            Paragraph(f"Prepared By: <b>{quotation.prepared_by or 'Engineering Lead'}</b>", style_body),
        ]

        party_tbl = Table([[c_box, r_box]], colWidths=[269, 250])
        party_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdfa")), # Light teal background
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#99f6e4")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        content.append(party_tbl)
        content.append(Spacer(1, 10))

        # 3. Item Table
        headers = [
            Paragraph("<b>#</b>", style_tbl_hdr),
            Paragraph("<b>Component Description</b>", style_tbl_hdr),
            Paragraph("<b>Drawing</b>", style_tbl_hdr),
            Paragraph("<b>Material</b>", style_tbl_hdr),
            Paragraph("<b>Process</b>", style_tbl_hdr),
            Paragraph("<b>Qty</b>", style_tbl_hdr),
            Paragraph("<b>Unit</b>", style_tbl_hdr),
            Paragraph("<b>Rate (₹)</b>", style_tbl_hdr),
            Paragraph("<b>Amount (₹)</b>", style_tbl_hdr),
        ]
        table_data = [headers]

        sorted_items = sorted(quotation.items, key=lambda it: it.item_number or 0)
        for idx, it in enumerate(sorted_items):
            desc_lines = [f"<b>{it.part_name}</b>"]
            if it.specification:
                desc_lines.append(f"<font color='#64748b'>{it.specification}</font>")
            desc_p = Paragraph("<br/>".join(desc_lines), style_body)

            drw_p = Paragraph(it.drawing_number or "-", style_mono)
            mat_p = Paragraph(it.material or "-", style_body)
            prc_p = Paragraph(it.process or "-", style_body)
            qty_p = Paragraph(f"{it.quantity:,.0f}" if it.quantity % 1 == 0 else f"{it.quantity:,.2f}", style_mono)
            unit_p = Paragraph(it.unit or "PCS", style_body)
            rate_p = Paragraph(f"{it.unit_price:,.2f}", style_mono_r)
            tot_p = Paragraph(f"{it.total_price:,.2f}", style_mono_r)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), style_mono)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, unit_p, rate_p, tot_p])

        col_widths = [20, 149, 60, 55, 60, 35, 30, 55, 55]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ccfbf1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        for r_idx in range(1, len(table_data)):
            if r_idx % 2 == 0:
                items_tbl.setStyle(TableStyle([("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f0fdfa"))]))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 4. Financial Cost Summary & Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("<b>TOTAL IN WORDS (INR):</b>", style_sec_title))
        left_box.append(Spacer(1, 2))
        left_box.append(Paragraph(f"<b>{words}</b>", style_body))
        left_box.append(Spacer(1, 6))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("<b>BANK REMITTANCE:</b>", style_sec_title))
                left_box.append(Spacer(1, 2))
                b_lines = [
                    f"Bank: <b>{b_name}</b> ({bank_s.get('branch') or 'Main Branch'})",
                    f"A/C No: <b><font face='Courier'>{bank_s.get('account_number')}</font></b>",
                    f"IFSC Code: <b><font face='Courier'>{bank_s.get('ifsc')}</font></b>",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), style_body))

        calc_rows = [
            ("Material Subtotal", f"₹ {quotation.material_cost:,.2f}"),
            ("Process / Machining", f"₹ {quotation.process_cost:,.2f}"),
            ("Production Subtotal", f"₹ {quotation.subtotal:,.2f}"),
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
            summary_rows.append([Paragraph(label, style_body), Paragraph(val, style_mono_r)])
        summary_rows.append([
            Paragraph("<b>TOTAL QUOTED (INR)</b>", ParagraphStyle("CM_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=colors.white)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("CM_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=colors.white))
        ])

        summary_tbl = Table(summary_rows, colWidths=[150, 95])
        summary_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, 2), (1, 2), 0.5, colors.HexColor("#ccfbf1")),
            ("LINEBELOW", (0, 5), (1, 5), 0.5, colors.HexColor("#ccfbf1")),
            ("BACKGROUND", (0, -1), (1, -1), primary),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, -1), (1, -1), 5),
            ("BOTTOMPADDING", (0, -1), (1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        comm_tbl = Table([[left_box, summary_tbl]], colWidths=[269, 250])
        comm_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(KeepTogether([comm_tbl]))
        content.append(Spacer(1, 8))

        # 5. Terms & Signatures
        bottom_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                Paragraph("<b>COMMERCIAL TERMS:</b>", style_sec_title),
                Spacer(1, 1),
                Paragraph(f"1. Delivery: {quotation.delivery_terms or 'Standard Works Bhosari'}", style_body),
                Paragraph(f"2. Payment: {quotation.payment_terms or '30 Days credit'}", style_body),
                Paragraph(f"3. Inspection: {quotation.inspection_terms or 'Pre-dispatch test cert'}", style_body),
            ]
            bottom_elements.append(Table([[terms_lines]], colWidths=[519], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#99f6e4")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdfa")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            bottom_elements.append(Spacer(1, 8))

        if cfg.get("show_signature", True):
            sig_table = Table([[
                Paragraph(f"Prepared by: <b>{quotation.prepared_by or 'Engineering Lead'}</b>", style_body),
                Paragraph(f"For <b>{company.name}</b><br/><br/><br/>___________________________<br/><b>{quotation.authorized_signatory or 'Commercial Director'}</b>", style_body)
            ]], colWidths=[260, 259])
            sig_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            bottom_elements.append(sig_table)

        if bottom_elements:
            content.append(KeepTogether(bottom_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI | Creative Precision Engineering"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

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


class PremiumCorporateTemplate(BaseQuotationTemplate):
    """
    Template 3: Premium Corporate
    High-end executive look featuring a full-width dark slate header banner,
    inverted typography, gold/emerald status indicator, refined card modules,
    and sophisticated summary block.
    """

    def __init__(self):
        super().__init__("premium_corporate", "Premium Corporate")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#0f172a") # Dark Slate
        accent = self.get_color(cfg.get("secondary_color"), "#d97706") # Amber / Gold
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=38,
            rightMargin=38,
            topMargin=32,
            bottomMargin=38,
        )

        content = []
        base = getSampleStyleSheet()

        # Inverted Header Styles
        hdr_company = ParagraphStyle("PC_HdrComp", parent=base["Normal"], fontName=bold_font, fontSize=15, leading=17, textColor=colors.white)
        hdr_meta = ParagraphStyle("PC_HdrMeta", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#94a3b8"))
        hdr_title = ParagraphStyle("PC_HdrTitle", parent=base["Normal"], fontName=bold_font, fontSize=17, leading=19, alignment=2, textColor=colors.white)
        hdr_quote_meta = ParagraphStyle("PC_HdrQMeta", parent=base["Normal"], fontName=font, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#cbd5e1"))

        # Body Styles
        sec_title = ParagraphStyle("PC_SecTitle", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=10, textColor=primary, textTransform="uppercase")
        body_text = ParagraphStyle("PC_BodyText", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"))
        body_bold = ParagraphStyle("PC_BodyBold", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=11, textColor=colors.HexColor("#0f172a"))
        tbl_hdr = ParagraphStyle("PC_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, alignment=1, textColor=colors.white)
        mono_cell = ParagraphStyle("PC_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        mono_right = ParagraphStyle("PC_MonoR", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Dark Full-Width Header Banner
        comp_lines = [f"<b>{company.name.upper()}</b>"]
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))
        if cfg.get("show_company_contact", True):
            con = []
            if company.phone: con.append(f"T: {company.phone}")
            if company.email: con.append(f"E: {company.email}")
            if con: comp_lines.append(" | ".join(con))
        if cfg.get("show_gstin", True) and company.gstin:
            comp_lines.append(f"GSTIN: <font face='Courier'><b>{company.gstin}</b></font>")

        left_hdr_p = Paragraph("<br/>".join(comp_lines), hdr_meta)

        q_date = self.format_date(quotation.quotation_date)
        v_date = self.format_date(quotation.valid_until, "30 Days from Issue")
        right_hdr_lines = [
            f"<font size=16><b>COMMERCIAL QUOTATION</b></font>",
            f"Ref: <b><font face='Courier'>{quotation.quotation_number}</font></b>",
            f"Date: <b><font face='Courier'>{q_date}</font></b>",
            f"Valid Until: <b><font face='Courier'>{v_date}</font></b>",
            f"Status: <font color='#10b981'><b>{quotation.status}</b></font>"
        ]
        right_hdr_p = Paragraph("<br/>".join(right_hdr_lines), hdr_quote_meta)

        banner_tbl = Table([[left_hdr_p, right_hdr_p]], colWidths=[319, 200])
        banner_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), primary),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        content.append(banner_tbl)
        content.append(Spacer(1, 10))

        # 2. Structured Information Blocks
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Client")
        cust_addr = (customer.billing_address or customer.shipping_address or "Not Provided") if customer else "Not Provided"
        cust_gstin = customer.gstin if customer and customer.gstin else "Unregistered"

        client_card = [
            Paragraph("CLIENT CREDENTIALS", sec_title),
            Spacer(1, 2),
            Paragraph(f"<b>{cust_name}</b>", body_bold),
            Paragraph(cust_addr, body_text),
            Paragraph(f"GSTIN: <font face='Courier'><b>{cust_gstin}</b></font>", body_text),
        ]

        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = self.format_date(purchase_order.po_date if purchase_order else None)
        po_card = [
            Paragraph("ORDER SPECIFICATIONS", sec_title),
            Spacer(1, 2),
            Paragraph(f"Purchase Order: <font face='Courier'><b>{po_num}</b></font>", body_text),
            Paragraph(f"PO Date: <font face='Courier'>{po_date}</font>", body_text),
            Paragraph(f"Costing Lead: <b>{quotation.prepared_by or 'Engineering Dept'}</b>", body_text),
        ]

        info_tbl = Table([[client_card, po_card]], colWidths=[269, 250])
        info_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("LINEBEFORE", (1, 0), (1, 0), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        content.append(info_tbl)
        content.append(Spacer(1, 10))

        # 3. Item Table
        headers = [
            Paragraph("<b>#</b>", tbl_hdr),
            Paragraph("<b>Component Description</b>", tbl_hdr),
            Paragraph("<b>Drawing / Ref</b>", tbl_hdr),
            Paragraph("<b>Material</b>", tbl_hdr),
            Paragraph("<b>Process</b>", tbl_hdr),
            Paragraph("<b>Qty</b>", tbl_hdr),
            Paragraph("<b>Unit</b>", tbl_hdr),
            Paragraph("<b>Rate (₹)</b>", tbl_hdr),
            Paragraph("<b>Total (₹)</b>", tbl_hdr),
        ]
        table_data = [headers]

        sorted_items = sorted(quotation.items, key=lambda it: it.item_number or 0)
        for idx, it in enumerate(sorted_items):
            desc_lines = [f"<b>{it.part_name}</b>"]
            if it.specification:
                desc_lines.append(f"<font color='#64748b'>{it.specification}</font>")
            desc_p = Paragraph("<br/>".join(desc_lines), body_text)

            drw_p = Paragraph(it.drawing_number or "-", mono_cell)
            mat_p = Paragraph(it.material or "-", body_text)
            prc_p = Paragraph(it.process or "-", body_text)
            qty_p = Paragraph(f"{it.quantity:,.0f}" if it.quantity % 1 == 0 else f"{it.quantity:,.2f}", mono_cell)
            unit_p = Paragraph(it.unit or "PCS", body_text)
            rate_p = Paragraph(f"{it.unit_price:,.2f}", mono_right)
            tot_p = Paragraph(f"{it.total_price:,.2f}", mono_right)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), mono_cell)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, unit_p, rate_p, tot_p])

        col_widths = [20, 149, 60, 55, 60, 35, 30, 55, 55]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 4. Commercial Summary & Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("AMOUNT IN WORDS", sec_title))
        left_box.append(Spacer(1, 2))
        left_box.append(Paragraph(f"<b>{words}</b>", body_text))
        left_box.append(Spacer(1, 8))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("BANK SETTLEMENT INSTRUCTIONS", sec_title))
                left_box.append(Spacer(1, 2))
                b_lines = [
                    f"Bank: <b>{b_name}</b> ({bank_s.get('branch') or 'Main'})",
                    f"Account Name: <b>{bank_s.get('account_name') or company.name}</b>",
                    f"Account No: <b><font face='Courier'>{bank_s.get('account_number')}</font></b>",
                    f"IFSC Code: <b><font face='Courier'>{bank_s.get('ifsc')}</font></b>",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), body_text))

        calc_rows = [
            ("Gross Material Cost", f"₹ {quotation.material_cost:,.2f}"),
            ("Direct Process Cost", f"₹ {quotation.process_cost:,.2f}"),
            ("Production Subtotal", f"₹ {quotation.subtotal:,.2f}"),
            (f"Plant Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            (f"Operating Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Taxable Commercial Value", f"₹ {quotation.taxable_amount:,.2f}"),
        ]
        if quotation.gst_type == "IGST":
            calc_rows.append((f"IGST ({quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"Central GST ({quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"State GST ({quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_rows = []
        for label, val in calc_rows:
            summary_rows.append([
                Paragraph(label, body_text),
                Paragraph(val, mono_right)
            ])
        summary_rows.append([
            Paragraph("<b>NET QUOTED VALUE (INR)</b>", ParagraphStyle("PC_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=colors.white)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("PC_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=colors.white))
        ])

        summary_tbl = Table(summary_rows, colWidths=[150, 95])
        summary_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, 2), (1, 2), 0.5, colors.HexColor("#cbd5e1")),
            ("LINEBELOW", (0, 5), (1, 5), 0.5, colors.HexColor("#cbd5e1")),
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
        content.append(Spacer(1, 10))

        # 5. Terms & Signatures
        bottom_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                Paragraph("STATUTORY TERMS OF SUPPLY", sec_title),
                Spacer(1, 2),
                Paragraph(f"• <b>Delivery Terms:</b> {quotation.delivery_terms or 'Standard Works Bhosari'}", body_text),
                Paragraph(f"• <b>Commercial Credit:</b> {quotation.payment_terms or '30 Days from invoice'}", body_text),
                Paragraph(f"• <b>Quality Clearance:</b> {quotation.inspection_terms or 'Pre-dispatch test cert'}", body_text),
            ]
            bottom_elements.append(Table([[terms_lines]], colWidths=[519], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            bottom_elements.append(Spacer(1, 8))

        if cfg.get("show_signature", True):
            sig_table = Table([[
                Paragraph(f"<b>Prepared By:</b><br/>{quotation.prepared_by or 'Rajesh Deshmukh'}<br/><font color='#64748b'>Senior Costing Engineer</font>", body_text),
                Paragraph(f"<b>For {company.name}</b><br/><br/><br/>___________________________<br/><b>{quotation.authorized_signatory or 'Managing Director'}</b>", body_text)
            ]], colWidths=[260, 259])
            sig_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]))
            bottom_elements.append(sig_table)

        if bottom_elements:
            content.append(KeepTogether(bottom_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI | Enterprise Precision Quotation Engine"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

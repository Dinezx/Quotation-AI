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


class ModernTwoColumnTemplate(BaseQuotationTemplate):
    """
    Template 6: Modern Two-Column
    Two distinct visual columns in the upper section:
    Left Column: Manufacturer identity, works location, contact, and bank remittance.
    Right Column: Commercial quotation reference, customer billing/shipping, and PO meta.
    Followed by a full-width item table and compact total breakdown.
    """

    def __init__(self):
        super().__init__("modern_two_column", "Modern Two-Column")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#0369a1") # Sky / Ocean Blue
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=32,
            bottomMargin=36,
        )

        content = []
        base = getSampleStyleSheet()

        col_title = ParagraphStyle("MTC_ColTitle", parent=base["Normal"], fontName=bold_font, fontSize=8.5, leading=11, textColor=primary, textTransform="uppercase")
        comp_name_style = ParagraphStyle("MTC_CompName", parent=base["Normal"], fontName=bold_font, fontSize=13, leading=15, textColor=colors.HexColor("#0f172a"))
        body_text = ParagraphStyle("MTC_Body", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#334155"))
        body_bold = ParagraphStyle("MTC_BodyB", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=11, textColor=colors.HexColor("#0f172a"))
        tbl_hdr = ParagraphStyle("MTC_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, alignment=1, textColor=colors.white)
        mono_cell = ParagraphStyle("MTC_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        mono_r = ParagraphStyle("MTC_MonoR", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Two-Column Header Block
        # Left Column: Manufacturer Profile + Remittance
        left_col = [
            Paragraph(f"<b>{company.name}</b>", comp_name_style),
            Spacer(1, 1),
            Paragraph(company.address.replace("\n", ", ") if company.address else "Works Location", body_text),
        ]
        if cfg.get("show_company_contact", True):
            con = []
            if company.phone: con.append(f"Phone: {company.phone}")
            if company.email: con.append(f"Email: {company.email}")
            if con: left_col.append(Paragraph(" | ".join(con), body_text))
        if cfg.get("show_gstin", True) and company.gstin:
            left_col.append(Paragraph(f"GSTIN: <font face='Courier'><b>{company.gstin}</b></font>", body_text))

        # Right Column: Quotation Metadata + Customer Info
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Client")
        cust_addr = (customer.billing_address or customer.shipping_address or "") if customer else ""
        cust_gstin = customer.gstin if customer and customer.gstin else "N/A"
        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        q_date = self.format_date(quotation.quotation_date)
        v_date = self.format_date(quotation.valid_until, "30 Days")

        right_col = [
            Paragraph(f"<font size=14><b>QUOTATION</b></font> <font color='{primary.hexval()}'><b>#{quotation.quotation_number}</b></font>", body_bold),
            Spacer(1, 2),
            Paragraph(f"Date: <b>{q_date}</b> | Valid: <b>{v_date}</b> | Status: <b>{quotation.status}</b>", body_text),
            Spacer(1, 4),
            Paragraph(f"<b>Quotation To:</b> {cust_name}", body_bold),
            Paragraph(f"Address: {cust_addr}", body_text),
            Paragraph(f"Cust. GSTIN: <font face='Courier'><b>{cust_gstin}</b></font> | PO Ref: <font face='Courier'><b>{po_num}</b></font>", body_text),
        ]

        two_col_tbl = Table([[left_col, right_col]], colWidths=[255, 268])
        two_col_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#cbd5e1")),
            ("BOX", (1, 0), (1, 0), 0.5, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        content.append(two_col_tbl)
        content.append(Spacer(1, 10))

        # 2. Modern Item Table
        headers = [
            Paragraph("<b>#</b>", tbl_hdr),
            Paragraph("<b>Item Description & Specification</b>", tbl_hdr),
            Paragraph("<b>Drawing</b>", tbl_hdr),
            Paragraph("<b>Material</b>", tbl_hdr),
            Paragraph("<b>Process</b>", tbl_hdr),
            Paragraph("<b>Qty</b>", tbl_hdr),
            Paragraph("<b>Unit</b>", tbl_hdr),
            Paragraph("<b>Unit Rate (₹)</b>", tbl_hdr),
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
            rate_p = Paragraph(f"{it.unit_price:,.2f}", mono_r)
            tot_p = Paragraph(f"{it.total_price:,.2f}", mono_r)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), mono_cell)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, unit_p, rate_p, tot_p])

        col_widths = [20, 153, 60, 55, 60, 35, 30, 55, 55]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        for r_idx in range(1, len(table_data)):
            if r_idx % 2 == 0:
                items_tbl.setStyle(TableStyle([("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc"))]))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 3. Financial Summary + Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("<b>AMOUNT IN WORDS (INR):</b>", col_title))
        left_box.append(Spacer(1, 2))
        left_box.append(Paragraph(f"<b>{words}</b>", body_text))
        left_box.append(Spacer(1, 6))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("<b>BANK REMITTANCE DETAILS:</b>", col_title))
                left_box.append(Spacer(1, 2))
                b_lines = [
                    f"Bank: <b>{b_name}</b> ({bank_s.get('branch') or 'Main'})",
                    f"Account: <b><font face='Courier'>{bank_s.get('account_number')}</font></b>",
                    f"IFSC: <b><font face='Courier'>{bank_s.get('ifsc')}</font></b>",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), body_text))

        calc_rows = [
            ("Material Cost", f"₹ {quotation.material_cost:,.2f}"),
            ("Process Cost", f"₹ {quotation.process_cost:,.2f}"),
            ("Manufacturing Subtotal", f"₹ {quotation.subtotal:,.2f}"),
            (f"Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            (f"Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Taxable Value", f"₹ {quotation.taxable_amount:,.2f}"),
        ]
        if quotation.gst_type == "IGST":
            calc_rows.append((f"IGST ({quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"CGST ({quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"SGST ({quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_rows = []
        for label, val in calc_rows:
            summary_rows.append([Paragraph(label, body_text), Paragraph(val, mono_r)])
        summary_rows.append([
            Paragraph("<b>GRAND TOTAL (INR)</b>", ParagraphStyle("MTC_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=colors.white)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("MTC_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=colors.white))
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

        comm_tbl = Table([[left_box, summary_tbl]], colWidths=[278, 245])
        comm_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(KeepTogether([comm_tbl]))
        content.append(Spacer(1, 8))

        # 4. Terms & Signatures
        bottom_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                Paragraph("<b>COMMERCIAL TERMS:</b>", col_title),
                Spacer(1, 1),
                Paragraph(f"1. Delivery: {quotation.delivery_terms or 'Ex-Works'}", body_text),
                Paragraph(f"2. Payment: {quotation.payment_terms or '30 Days credit'}", body_text),
                Paragraph(f"3. Inspection: {quotation.inspection_terms or 'Pre-dispatch test cert'}", body_text),
            ]
            bottom_elements.append(Table([[terms_lines]], colWidths=[523], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            bottom_elements.append(Spacer(1, 8))

        if cfg.get("show_signature", True):
            sig_table = Table([[
                Paragraph(f"Prepared by: <b>{quotation.prepared_by or 'Engineering Lead'}</b>", body_text),
                Paragraph(f"For <b>{company.name}</b><br/><br/><br/>___________________________<br/><b>{quotation.authorized_signatory or 'Authorized Signatory'}</b>", body_text)
            ]], colWidths=[260, 263])
            sig_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            bottom_elements.append(sig_table)

        if bottom_elements:
            content.append(KeepTogether(bottom_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI | Modern Two-Column Quotation"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

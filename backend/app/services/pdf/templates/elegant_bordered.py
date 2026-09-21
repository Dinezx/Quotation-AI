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


class ElegantBorderedTemplate(BaseQuotationTemplate):
    """
    Template 4: Elegant Bordered
    Formal, dignified commercial layout featuring elegant double/thin line border frames,
    refined serif/clean typography, structured information boxes, and traditional contract aesthetics.
    """

    def __init__(self):
        super().__init__("elegant_bordered", "Elegant Bordered")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#1e293b")
        font = self.get_font_name(cfg.get("font_family") or "Times-Roman")
        bold_font = self.get_bold_font(font)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=38,
            rightMargin=38,
            topMargin=36,
            bottomMargin=40,
        )

        content = []
        base = getSampleStyleSheet()

        title_style = ParagraphStyle("EB_Title", parent=base["Normal"], fontName=bold_font, fontSize=16, leading=18, alignment=1, textColor=primary)
        sub_style = ParagraphStyle("EB_Sub", parent=base["Normal"], fontName=font, fontSize=8, leading=11, alignment=1, textColor=colors.HexColor("#334155"))
        banner_style = ParagraphStyle("EB_Banner", parent=base["Normal"], fontName=bold_font, fontSize=11, leading=13, alignment=1, textColor=primary)
        box_hdr = ParagraphStyle("EB_BoxHdr", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=10, textColor=primary)
        body_text = ParagraphStyle("EB_Body", parent=base["Normal"], fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"))
        body_bold = ParagraphStyle("EB_BodyB", parent=base["Normal"], fontName=bold_font, fontSize=8, leading=11, textColor=primary)
        tbl_hdr = ParagraphStyle("EB_TblHdr", parent=base["Normal"], fontName=bold_font, fontSize=7.5, leading=9, alignment=1, textColor=primary)
        mono_cell = ParagraphStyle("EB_Mono", parent=base["Normal"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a"))
        mono_r = ParagraphStyle("EB_MonoR", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a"))

        # 1. Company Letterhead (Centered Formal)
        head_lines = [
            f"<font size=15><b>{company.name.upper()}</b></font>",
        ]
        if company.legal_name and company.legal_name != company.name:
            head_lines.append(f"({company.legal_name})")
        if company.address:
            head_lines.append(company.address.replace("\n", ", "))

        contacts = []
        if cfg.get("show_company_contact", True):
            if company.phone: contacts.append(f"Tel: {company.phone}")
            if company.email: contacts.append(f"Email: {company.email}")
        if cfg.get("show_gstin", True) and company.gstin:
            contacts.append(f"GSTIN: <b>{company.gstin}</b>")
        if contacts:
            head_lines.append(" | ".join(contacts))

        header_tbl = Table([[Paragraph("<br/>".join(head_lines), sub_style)]], colWidths=[519])
        header_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, primary),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        content.append(header_tbl)
        content.append(Spacer(1, 6))

        # Formal Title Bar
        q_date = self.format_date(quotation.quotation_date)
        v_date = self.format_date(quotation.valid_until, "30 Days")
        title_bar_data = [[
            Paragraph(f"<b>FORMAL ENGINEERING QUOTATION — {quotation.quotation_number}</b>", banner_style),
            Paragraph(f"Date: <b>{q_date}</b> | Valid Until: <b>{v_date}</b>", ParagraphStyle("EB_Date", parent=base["Normal"], fontName=font, fontSize=8, alignment=2, textColor=colors.HexColor("#475569")))
        ]]
        title_tbl = Table(title_bar_data, colWidths=[330, 189])
        title_tbl.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 1, primary),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        content.append(title_tbl)
        content.append(Spacer(1, 8))

        # 2. Customer & Reference in Bordered Panels
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Client")
        cust_addr = (customer.billing_address or customer.shipping_address or "Not Provided") if customer else "Not Provided"
        cust_gstin = customer.gstin if customer and customer.gstin else "Unregistered"

        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = self.format_date(purchase_order.po_date if purchase_order else None)

        c_box = [
            Paragraph("<b>PARTY DETAILS:</b>", box_hdr),
            Spacer(1, 2),
            Paragraph(f"<b>M/s. {cust_name}</b>", body_bold),
            Paragraph(f"Address: {cust_addr}", body_text),
            Paragraph(f"GSTIN: <font face='Courier'><b>{cust_gstin}</b></font>", body_text),
        ]

        r_box = [
            Paragraph("<b>PURCHASE ORDER REFERENCE:</b>", box_hdr),
            Spacer(1, 2),
            Paragraph(f"P.O. Number: <font face='Courier'><b>{po_num}</b></font>", body_text),
            Paragraph(f"P.O. Date: <font face='Courier'>{po_date}</font>", body_text),
            Paragraph(f"Prepared By: <b>{quotation.prepared_by or 'Engineering Sales'}</b>", body_text),
        ]

        ref_tbl = Table([[c_box, r_box]], colWidths=[264, 255])
        ref_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#94a3b8")),
            ("BOX", (1, 0), (1, 0), 0.5, colors.HexColor("#94a3b8")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        content.append(ref_tbl)
        content.append(Spacer(1, 8))

        # 3. Item Table (Bordered Classic Grid)
        headers = [
            Paragraph("<b>Sr.</b>", tbl_hdr),
            Paragraph("<b>Item Description & Specifications</b>", tbl_hdr),
            Paragraph("<b>Drg No.</b>", tbl_hdr),
            Paragraph("<b>Material</b>", tbl_hdr),
            Paragraph("<b>Process</b>", tbl_hdr),
            Paragraph("<b>Qty</b>", tbl_hdr),
            Paragraph("<b>Unit</b>", tbl_hdr),
            Paragraph("<b>Rate (₹)</b>", tbl_hdr),
            Paragraph("<b>Amount (₹)</b>", tbl_hdr),
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

        col_widths = [22, 147, 60, 55, 60, 35, 30, 55, 55]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 4. Financial Cost Summary & Remittance
        left_box = []
        words = self.get_amount_in_words(quotation)
        left_box.append(Paragraph("<b>TOTAL IN WORDS:</b>", box_hdr))
        left_box.append(Spacer(1, 2))
        left_box.append(Paragraph(f"<b>{words}</b>", body_text))
        left_box.append(Spacer(1, 6))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            if b_name and bank_s.get("account_number"):
                left_box.append(Paragraph("<b>BANK REMITTANCE:</b>", box_hdr))
                left_box.append(Spacer(1, 2))
                b_lines = [
                    f"Bank: <b>{b_name}</b>, Branch: {bank_s.get('branch') or 'Main'}",
                    f"A/C Name: {bank_s.get('account_name') or company.name}",
                    f"A/C No: <b><font face='Courier'>{bank_s.get('account_number')}</font></b> | IFSC: <b><font face='Courier'>{bank_s.get('ifsc')}</font></b>",
                ]
                left_box.append(Paragraph("<br/>".join(b_lines), body_text))

        calc_rows = [
            ("Material Subtotal", f"₹ {quotation.material_cost:,.2f}"),
            ("Process / Machining Cost", f"₹ {quotation.process_cost:,.2f}"),
            ("Net Manufacturing Cost", f"₹ {quotation.subtotal:,.2f}"),
            (f"Plant Overhead ({quotation.overhead_percentage:g}%)", f"₹ {quotation.overhead_amount:,.2f}"),
            (f"Profit Margin ({quotation.profit_percentage:g}%)", f"₹ {quotation.profit_amount:,.2f}"),
            ("Assessable / Taxable Value", f"₹ {quotation.taxable_amount:,.2f}"),
        ]
        if quotation.gst_type == "IGST":
            calc_rows.append((f"IGST ({quotation.igst_rate:g}%)", f"₹ {quotation.igst_amount:,.2f}"))
        else:
            calc_rows.append((f"Central GST ({quotation.cgst_rate:g}%)", f"₹ {quotation.cgst_amount:,.2f}"))
            calc_rows.append((f"State GST ({quotation.sgst_rate:g}%)", f"₹ {quotation.sgst_amount:,.2f}"))

        summary_rows = []
        for label, val in calc_rows:
            summary_rows.append([Paragraph(label, body_text), Paragraph(val, mono_r)])
        summary_rows.append([
            Paragraph("<b>GRAND TOTAL (INR)</b>", ParagraphStyle("EB_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=9, textColor=primary)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("EB_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=primary))
        ])

        summary_tbl = Table(summary_rows, colWidths=[150, 95])
        summary_tbl.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
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

        # 5. Terms & Signature in Formal Box
        bottom_elements = []
        if cfg.get("show_terms", True):
            terms_lines = [
                Paragraph("<b>TERMS OF SUPPLY:</b>", box_hdr),
                Spacer(1, 1),
                Paragraph(f"1. Delivery: {quotation.delivery_terms or 'Ex-Works'}", body_text),
                Paragraph(f"2. Payment: {quotation.payment_terms or '30 Days credit'}", body_text),
                Paragraph(f"3. Inspection: {quotation.inspection_terms or 'Pre-dispatch'}", body_text),
                Paragraph(f"4. General: {quotation.notes or 'Dimensions as per drawing'}", body_text),
            ]
            bottom_elements.append(Table([[terms_lines]], colWidths=[519], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            bottom_elements.append(Spacer(1, 8))

        if cfg.get("show_signature", True):
            sig_table = Table([[
                Paragraph(f"Prepared by: <b>{quotation.prepared_by or 'Commercial Engineer'}</b>", body_text),
                Paragraph(f"For <b>{company.name}</b><br/><br/><br/>___________________________<br/><b>{quotation.authorized_signatory or 'Authorized Signatory'}</b>", body_text)
            ]], colWidths=[250, 269])
            sig_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            bottom_elements.append(sig_table)

        if bottom_elements:
            content.append(KeepTogether(bottom_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI | Precision Manufacturing Quotation"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

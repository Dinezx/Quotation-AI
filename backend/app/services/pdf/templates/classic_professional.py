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


class ClassicProfessionalTemplate(BaseQuotationTemplate):
    """
    Template 1: Classic Professional
    Traditional, authoritative corporate engineering layout with blue accents,
    structured header, formal reference box, full-width grid item table, and clear remittance block.
    """

    def __init__(self):
        super().__init__("classic_professional", "Classic Professional")

    def render(
        self,
        quotation: Quotation,
        company: Company,
        customer: Optional[Customer] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        cfg = config or {}
        primary = self.get_color(cfg.get("primary_color"), "#1e3a8a")
        secondary = self.get_color(cfg.get("secondary_color"), "#64748b")
        font = self.get_font_name(cfg.get("font_family"))
        bold_font = self.get_bold_font(font)

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
        base = getSampleStyleSheet()

        # Styles
        style_comp_title = ParagraphStyle(
            "CP_CompTitle", parent=base["Normal"],
            fontName=bold_font, fontSize=14, leading=16, textColor=primary
        )
        style_comp_meta = ParagraphStyle(
            "CP_CompMeta", parent=base["Normal"],
            fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#334155")
        )
        style_doc_title = ParagraphStyle(
            "CP_DocTitle", parent=base["Normal"],
            fontName=bold_font, fontSize=18, leading=20, alignment=2, textColor=primary
        )
        style_doc_meta = ParagraphStyle(
            "CP_DocMeta", parent=base["Normal"],
            fontName=font, fontSize=8.5, leading=12, alignment=2, textColor=colors.HexColor("#334155")
        )
        style_sec_hdr = ParagraphStyle(
            "CP_SecHdr", parent=base["Normal"],
            fontName=bold_font, fontSize=8, leading=10, textColor=primary, textTransform="uppercase"
        )
        style_body = ParagraphStyle(
            "CP_Body", parent=base["Normal"],
            fontName=font, fontSize=8, leading=11, textColor=colors.HexColor("#1e293b")
        )
        style_body_bold = ParagraphStyle(
            "CP_BodyBold", parent=base["Normal"],
            fontName=bold_font, fontSize=8, leading=11, textColor=colors.HexColor("#0f172a")
        )
        style_mono = ParagraphStyle(
            "CP_Mono", parent=base["Normal"],
            fontName="Courier", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0f172a")
        )
        style_mono_right = ParagraphStyle(
            "CP_MonoRight", parent=base["Normal"],
            fontName="Courier", fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#0f172a")
        )
        style_tbl_hdr = ParagraphStyle(
            "CP_TblHdr", parent=base["Normal"],
            fontName=bold_font, fontSize=7.5, leading=9.5, alignment=1, textColor=colors.white
        )

        # 1. Company Header & Quotation Document Meta
        comp_lines = [f"<b>{company.name}</b>"]
        if company.legal_name and company.legal_name != company.name:
            comp_lines.append(f"<font color='#64748b'>({company.legal_name})</font>")
        if company.address:
            comp_lines.append(company.address.replace("\n", ", "))

        if cfg.get("show_company_contact", True):
            contact_line = []
            if company.phone:
                contact_line.append(f"Phone: {company.phone}")
            if company.email:
                contact_line.append(f"Email: {company.email}")
            if contact_line:
                comp_lines.append(" | ".join(contact_line))

        if cfg.get("show_gstin", True) and company.gstin:
            comp_lines.append(f"<b>GSTIN:</b> <font face='Courier'><b>{company.gstin}</b></font>")

        left_para = Paragraph("<br/>".join(comp_lines), style_comp_meta)

        status_color = "#059669" if quotation.status == "FINAL" else "#2563eb"
        status_badge = f"<font color='{status_color}'><b>[{quotation.status}]</b></font>"
        q_date_str = self.format_date(quotation.quotation_date)
        valid_until_str = self.format_date(quotation.valid_until, "30 Days from date of issue")

        right_lines = [
            f"<font size=18><b>QUOTATION</b></font>  {status_badge}",
            f"Quotation No: <b><font face='Courier'>{quotation.quotation_number}</font></b>",
            f"Date: <b><font face='Courier'>{q_date_str}</font></b>",
            f"Validity: <b><font face='Courier'>{valid_until_str}</font></b>",
            f"Currency: <b><font face='Courier'>{quotation.currency or 'INR'}</font></b>",
        ]
        right_para = Paragraph("<br/>".join(right_lines), style_doc_meta)

        header_tbl = Table([[left_para, right_para]], colWidths=[310, 205])
        header_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(header_tbl)
        content.append(Spacer(1, 10))

        # 2. Customer & Reference Section
        cust_name = customer.name if customer else (purchase_order.customer_name if purchase_order else "Valued Customer")
        cust_addr = (customer.billing_address or customer.shipping_address or "Not Provided") if customer else "Not Provided"
        cust_gstin = customer.gstin if customer and customer.gstin else "Unregistered / N/A"

        customer_box = [
            Paragraph("<b>QUOTATION TO:</b>", style_sec_hdr),
            Spacer(1, 2),
            Paragraph(f"<b>{cust_name}</b>", style_body_bold),
            Paragraph(f"Address: {cust_addr}", style_body),
            Paragraph(f"Customer GSTIN: <font face='Courier'><b>{cust_gstin}</b></font>", style_body),
        ]

        po_num = purchase_order.po_number if purchase_order else (quotation.purchase_order_id or "N/A")
        po_date = self.format_date(purchase_order.po_date if purchase_order else None)
        prepared_by = quotation.prepared_by or "Costing Engineering Department"

        reference_box = [
            Paragraph("<b>ORDER REFERENCE:</b>", style_sec_hdr),
            Spacer(1, 2),
            Paragraph(f"Purchase Order No: <font face='Courier'><b>{po_num}</b></font>", style_body),
            Paragraph(f"PO Date: <font face='Courier'>{po_date}</font>", style_body),
            Paragraph(f"Prepared By: <b>{prepared_by}</b>", style_body),
        ]

        party_tbl = Table([[customer_box, reference_box]], colWidths=[270, 245])
        party_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
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
            Paragraph("<b>Part Description & Spec</b>", style_tbl_hdr),
            Paragraph("<b>Drawing No.</b>", style_tbl_hdr),
            Paragraph("<b>Material</b>", style_tbl_hdr),
            Paragraph("<b>Process</b>", style_tbl_hdr),
            Paragraph("<b>Qty</b>", style_tbl_hdr),
            Paragraph("<b>Unit</b>", style_tbl_hdr),
            Paragraph("<b>Unit Price (₹)</b>", style_tbl_hdr),
            Paragraph("<b>Total Price (₹)</b>", style_tbl_hdr),
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
            rate_p = Paragraph(f"{it.unit_price:,.2f}", style_mono_right)
            tot_p = Paragraph(f"{it.total_price:,.2f}", style_mono_right)
            row_num_p = Paragraph(str(it.item_number or (idx + 1)), style_mono)

            table_data.append([row_num_p, desc_p, drw_p, mat_p, prc_p, qty_p, unit_p, rate_p, tot_p])

        col_widths = [20, 145, 60, 55, 60, 35, 30, 55, 55]
        items_tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]
        for r_idx in range(1, len(table_data)):
            if r_idx % 2 == 0:
                t_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc")))
        items_tbl.setStyle(TableStyle(t_style))
        content.append(items_tbl)
        content.append(Spacer(1, 8))

        # 4. Financial Cost Summary & Bank Remittance
        left_elements = []
        words = self.get_amount_in_words(quotation)
        left_elements.append(Paragraph("<b>AMOUNT IN WORDS (INR):</b>", style_sec_hdr))
        left_elements.append(Spacer(1, 2))
        left_elements.append(Paragraph(f"<b>{words}</b>", style_body))
        left_elements.append(Spacer(1, 8))

        if cfg.get("show_bank_details", True):
            bank_s = company.get_bank_settings() if hasattr(company, "get_bank_settings") else {}
            b_name = bank_s.get("bank_name")
            b_acc = bank_s.get("account_number")
            b_ifsc = bank_s.get("ifsc")
            if b_name and b_acc and b_ifsc:
                left_elements.append(Paragraph("<b>BANK REMITTANCE DETAILS:</b>", style_sec_hdr))
                left_elements.append(Spacer(1, 2))
                bank_lines = [
                    f"Bank Name: <b>{b_name}</b>",
                    f"Branch: {bank_s.get('branch') or 'Main Branch'}",
                    f"Account No: <b><font face='Courier'>{b_acc}</font></b>",
                    f"IFSC Code: <b><font face='Courier'>{b_ifsc}</font></b>",
                ]
                if bank_s.get("upi_id"):
                    bank_lines.append(f"UPI ID: <font face='Courier'>{bank_s.get('upi_id')}</font>")
                left_elements.append(Paragraph("<br/>".join(bank_lines), style_body))

        # Right Summary Breakdown
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

        summary_rows = []
        for label, val in calc_rows:
            is_sub = "Subtotal" in label or "Taxable" in label
            summary_rows.append([
                Paragraph(f"<b>{label}</b>" if is_sub else label, style_body),
                Paragraph(f"<b>{val}</b>" if is_sub else val, style_mono_right)
            ])
        summary_rows.append([
            Paragraph("<b>GRAND TOTAL (INR)</b>", ParagraphStyle("CP_GTLabel", parent=base["Normal"], fontName=bold_font, fontSize=10, textColor=colors.white)),
            Paragraph(f"<b>₹ {quotation.final_total:,.2f}</b>", ParagraphStyle("CP_GTVal", parent=base["Normal"], fontName="Courier-Bold", fontSize=11, alignment=2, textColor=colors.white))
        ])

        breakdown_table = Table(summary_rows, colWidths=[150, 95])
        breakdown_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 2), (1, 2), 0.5, colors.HexColor("#cbd5e1")),
            ("LINEBELOW", (0, 6), (1, 6), 0.5, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, -1), (1, -1), primary),
            ("TOPPADDING", (0, -1), (1, -1), 5),
            ("BOTTOMPADDING", (0, -1), (1, -1), 5),
        ]))

        comm_container = Table([[left_elements, breakdown_table]], colWidths=[265, 250])
        comm_container.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        content.append(KeepTogether([comm_container]))
        content.append(Spacer(1, 10))

        # 5. Terms & Signatures
        bottom_elements = []
        if cfg.get("show_terms", True):
            delivery = quotation.delivery_terms or "Ex-Works Factory Bhosari, Pune. Freight extra at actuals."
            payment = quotation.payment_terms or "30 Days from date of supply and inspection."
            inspection = quotation.inspection_terms or "Pre-dispatch inspection at manufacturer works."
            notes = quotation.notes or "Dimensions as per drawing. Standard machining tolerances apply."

            terms_lines = [
                Paragraph("<b>COMMERCIAL TERMS & CONDITIONS:</b>", style_sec_hdr),
                Spacer(1, 2),
                Paragraph(f"1. <b>Delivery Terms:</b> {delivery}", style_body),
                Paragraph(f"2. <b>Payment Terms:</b> {payment}", style_body),
                Paragraph(f"3. <b>Inspection:</b> {inspection}", style_body),
                Paragraph(f"4. <b>General Notes:</b> {notes}", style_body),
            ]
            bottom_elements.append(Table([[terms_lines]], colWidths=[515], style=[
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            bottom_elements.append(Spacer(1, 8))

        if cfg.get("show_signature", True):
            prep_by = quotation.prepared_by or "Rajesh Deshmukh"
            auth_sig = quotation.authorized_signatory or "Authorized Signatory"
            sig_data = [[
                Paragraph(f"<b>Prepared By:</b><br/>{prep_by}<br/><font color='#64748b'>Costing Engineering</font>", style_body),
                Paragraph(f"<b>For {company.name}</b><br/><br/><br/>___________________________<br/><b>{auth_sig}</b><br/><font color='#64748b'>Authorized Signatory</font>", style_body),
            ]]
            sig_table = Table(sig_data, colWidths=[250, 265])
            sig_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            bottom_elements.append(sig_table)

        if bottom_elements:
            content.append(KeepTogether(bottom_elements))

        footer_text = cfg.get("footer_text") or "Quotation AI Engineering Quotation System | Authoritative Deterministic Costing"
        show_footer = cfg.get("show_footer", True)

        def make_canvas(*args, **kwargs):
            return NumberedCanvas(*args, footer_text=footer_text, show_footer=show_footer, **kwargs)

        doc.build(content, canvasmaker=make_canvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

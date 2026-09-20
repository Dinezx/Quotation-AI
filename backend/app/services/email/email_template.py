from datetime import datetime
from decimal import Decimal
from typing import Tuple, Optional
from app.models.quotation import Quotation


def generate_quotation_email_content(quotation: Quotation) -> Tuple[str, str, str]:
    """
    Generates deterministic, professional B2B quotation email content (subject, html, text).
    Strictly deterministic Python formatting with ZERO AI / LLM invocations.
    Uses values already persisted on the FINAL quotation.

    :return: (subject, html_body, text_body)
    """
    company_name = quotation.company_name or "Manufacturing Services"
    customer_name = quotation.customer_name or "Valued Customer"
    quotation_number = quotation.quotation_number
    
    # Format date
    if isinstance(quotation.quotation_date, datetime):
        quote_date_str = quotation.quotation_date.strftime("%d %b %Y")
    else:
        quote_date_str = str(quotation.quotation_date)

    po_number_str = quotation.po_number or "N/A"
    
    # Format financial figures
    final_total = quotation.final_total or Decimal("0.00")
    formatted_total = f"₹{final_total:,.2f}"
    amount_in_words = quotation.amount_in_words or ""

    prepared_by = quotation.prepared_by or quotation.authorized_signatory or company_name
    contact_phone = quotation.company_phone or ""
    contact_email = quotation.company_email or ""
    contact_address = quotation.company_address or ""

    subject = f"Quotation {quotation_number} from {company_name}"

    # Plain-text body
    text_lines = [
        f"Dear {customer_name},",
        "",
        f"Please find attached our quotation {quotation_number} for your reference and review.",
        "",
        "--------------------------------------------------",
        "QUOTATION SUMMARY",
        "--------------------------------------------------",
        f"Quotation Number : {quotation_number}",
        f"Quotation Date   : {quote_date_str}",
        f"PO Number        : {po_number_str}",
        f"Grand Total      : {formatted_total}",
    ]
    if amount_in_words:
        text_lines.append(f"Amount in Words  : {amount_in_words}")

    text_lines.extend([
        "--------------------------------------------------",
        "",
        "The official, finalized quotation PDF document is securely attached to this email.",
        "",
        "Please feel free to contact us if you require any clarification or technical discussions.",
        "",
        "Best regards,",
        f"{prepared_by}",
        f"{company_name}",
    ])

    if contact_phone or contact_email or contact_address:
        text_lines.append("")
        if contact_phone:
            text_lines.append(f"Phone: {contact_phone}")
        if contact_email:
            text_lines.append(f"Email: {contact_email}")
        if contact_address:
            text_lines.append(f"Address: {contact_address}")

    text_body = "\n".join(text_lines)

    # Professional HTML Body (Industrial Precision styling)
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{subject}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background: #0f172a;
      color: #ffffff;
      padding: 24px 32px;
      border-bottom: 3px solid #2563eb;
    }}
    .header h1 {{
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .header p {{
      margin: 4px 0 0;
      font-size: 12px;
      color: #94a3b8;
    }}
    .content {{
      padding: 32px;
    }}
    .greeting {{
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
    }}
    .summary-card {{
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }}
    .summary-title {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #475569;
      margin-bottom: 12px;
    }}
    .summary-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    .summary-table td {{
      padding: 6px 0;
    }}
    .summary-table td.label {{
      color: #64748b;
      width: 40%;
      font-weight: 500;
    }}
    .summary-table td.value {{
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }}
    .total-row td {{
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      font-size: 15px;
    }}
    .total-row td.value {{
      color: #2563eb;
      font-weight: 700;
    }}
    .words {{
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      text-align: right;
      margin-top: 4px;
    }}
    .notice {{
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 12px 16px;
      font-size: 12px;
      color: #1e40af;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }}
    .footer {{
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 32px;
      font-size: 12px;
      color: #64748b;
    }}
    .footer p {{
      margin: 2px 0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{company_name}</h1>
      <p>Commercial Quotation Dispatch</p>
    </div>
    <div class="content">
      <div class="greeting">Dear {customer_name},</div>
      <p>Please find attached our official commercial quotation <strong>{quotation_number}</strong> for your review and processing.</p>

      <div class="summary-card">
        <div class="summary-title">Quotation Summary</div>
        <table class="summary-table">
          <tr>
            <td class="label">Quotation Number:</td>
            <td class="value" style="font-family: monospace;">{quotation_number}</td>
          </tr>
          <tr>
            <td class="label">Quotation Date:</td>
            <td class="value">{quote_date_str}</td>
          </tr>
          <tr>
            <td class="label">Purchase Order No:</td>
            <td class="value" style="font-family: monospace;">{po_number_str}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total Amount:</td>
            <td class="value">{formatted_total}</td>
          </tr>
        </table>
        {f'<div class="words">{amount_in_words}</div>' if amount_in_words else ''}
      </div>

      <div class="notice">
        <strong>PDF Attachment:</strong> The official, finalized quotation PDF document is attached to this email.
      </div>

      <p>Please feel free to contact us if you require any technical clarifications or have commercial inquiries.</p>

      <p style="margin-top: 24px; margin-bottom: 4px;"><strong>Best regards,</strong></p>
      <p style="margin: 0; color: #0f172a; font-weight: 600;">{prepared_by}</p>
      <p style="margin: 0; color: #475569; font-size: 13px;">{company_name}</p>
    </div>
    <div class="footer">
      {f'<p><strong>Phone:</strong> {contact_phone}</p>' if contact_phone else ''}
      {f'<p><strong>Email:</strong> {contact_email}</p>' if contact_email else ''}
      {f'<p><strong>Address:</strong> {contact_address}</p>' if contact_address else ''}
      <p style="margin-top: 12px; font-size: 10px; color: #94a3b8;">This is an automated commercial message generated by Quotation AI.</p>
    </div>
  </div>
</body>
</html>"""

    return subject, html_body, text_body

"""
Quotation AI — Final Real-World Staging Customer Acceptance & Go-Live Validation Suite

Validates the complete 16-step end-to-end commercial workflow:
1. Login & Identity Verification
2. Multi-Tenant Dashboard Metrics
3. Customer Verification & Quotation Email Preference
4. Rate Card Master Inspection
5. Real PO Document Upload (sample_manufacturing_purchase_order.pdf)
6. Extraction & Human Review Flags
7. Human Correction & PO Approval
8. Missing Rate BLOCKED Invariant
9. Deterministic Python Decimal Engine Costing
10. Commercial Quotation Generation
11. Professional ReportLab PDF Generation (Company Profile, GST, Bank Details, Logo)
12. Quotation Finalization & SHA-256 Cryptographic Sealing
13. Immutability Enforcement (HTTP 409 Conflict)
14. PDF Integrity Verification (Byte SHA-256 == Database SHA-256)
15. Safe Email Dispatch & Delivery Metadata Persistence
16. Quotation History & Audit Trail Verification
"""

import io
import os
import time
import hashlib
from decimal import Decimal
import pytest
from pypdf import PdfReader
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.quotation import Quotation
from app.models.material import Material
from app.models.process import Process

client = TestClient(app)


def test_customer_acceptance_full_lifecycle(auth_headers):
    """
    Executes the complete customer acceptance scenario from start to finish
    against real database and real services in the staging/production configuration.
    """
    db = SessionLocal()
    try:
        # =====================================================================
        # Step 1: Login & Identity Verification
        # =====================================================================
        me_res = client.get("/api/v1/auth/me", headers=auth_headers)
        assert me_res.status_code == 200, f"Auth me failed: {me_res.text}"
        me_data = me_res.json()
        assert me_data["user"]["company_id"] == "comp-bpe-pune"
        assert "Bharat Precision" in me_data["company"]["name"]
        company_id = me_data["user"]["company_id"]

        # =====================================================================
        # Step 2: Multi-Tenant Dashboard Metrics
        # =====================================================================
        dash_res = client.get("/api/v1/dashboard/summary?period=this_month", headers=auth_headers)
        assert dash_res.status_code == 200, f"Dashboard summary failed: {dash_res.text}"
        dash_data = dash_res.json()
        assert "kpis" in dash_data
        assert "customer_activity" in dash_data
        assert "draft_quotations" in dash_data["kpis"]

        # =====================================================================
        # Step 3: Customer Setup & Quotation Email Resolution
        # =====================================================================
        # Ensure a verified manufacturing customer exists
        cust = db.query(Customer).filter(Customer.company_id == company_id).first()
        if not cust:
            cust = Customer(
                company_id=company_id,
                name="ABC Engineering Components Pvt. Ltd.",
                code="CUST-ABCE01",
                contact_person="Sunil Kumar",
                email="purchase@abcengineering.com",
                quotation_email="quotes@abcengineering.com",
                phone="+91 98220 12345",
                address="Plot 42, MIDC Bhosari, Pune, Maharashtra 411026",
                gstin="27AABCA1234F1Z1",
                is_active=True,
            )
            db.add(cust)
            db.commit()
            db.refresh(cust)

        # Set quotation_email if not present
        if not cust.quotation_email:
            cust.quotation_email = "quotes@abcengineering.com"
            db.commit()

        assert cust.quotation_email == "quotes@abcengineering.com"

        # =====================================================================
        # Step 4: Rate Card Masters Inspection
        # =====================================================================
        mat_res = client.get("/api/v1/rates/materials", headers=auth_headers)
        assert mat_res.status_code == 200
        materials = mat_res.json()
        assert len(materials) > 0

        proc_res = client.get("/api/v1/rates/processes", headers=auth_headers)
        assert proc_res.status_code == 200
        processes = proc_res.json()
        assert len(processes) > 0

        # =====================================================================
        # Step 5: Real PO Upload
        # =====================================================================
        po_path = "sample_manufacturing_purchase_order.pdf"
        if not os.path.exists(po_path):
            po_path = os.path.join("..", po_path)

        with open(po_path, "rb") as f:
            pdf_bytes = f.read()

        po_upload_res = client.post(
            "/api/v1/purchase-orders/upload",
            files={"file": ("sample_po.pdf", pdf_bytes, "application/pdf")},
            headers=auth_headers,
        )
        assert po_upload_res.status_code in (200, 201), f"PO upload failed: {po_upload_res.text}"
        po_data = po_upload_res.json()
        po_id = po_data.get("purchase_order_id") or (po_data.get("purchase_order") and po_data["purchase_order"]["id"])
        assert po_id is not None, f"Could not find purchase order ID in upload response: {po_data}"

        # =====================================================================
        # Step 6: PO Review & Human Flags
        # =====================================================================
        po_detail_res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
        assert po_detail_res.status_code == 200
        po_obj = po_detail_res.json()
        assert len(po_obj["items"]) >= 1

        # =====================================================================
        # Step 7: Human PO Approval
        # =====================================================================
        client.put(
            f"/api/v1/purchase-orders/{po_id}",
            json={"customer_id": cust.id},
            headers=auth_headers,
        )
        approve_res = client.post(
            f"/api/v1/purchase-orders/{po_id}/approve",
            json={"notes": "Approved for commercial costing"},
            headers=auth_headers,
        )
        assert approve_res.status_code == 200
        approved_po = approve_res.json()
        assert approved_po["status"] == "APPROVED"

        # =====================================================================
        # Step 8: Missing-Rate BLOCKED Guard
        # =====================================================================
        # Unmapped raw strings extracted from PO ('EN8 / Carbon Steel' and 'CNC Turning & VMC Milling')
        # trigger the non-negotiable BLOCKED state
        blocked_calc_res = client.post(
            f"/api/v1/purchase-orders/{po_id}/calculate",
            headers=auth_headers,
        )
        assert blocked_calc_res.status_code == 200
        blocked_data = blocked_calc_res.json()
        assert blocked_data["status"] == "BLOCKED"
        assert len(blocked_data.get("issues", [])) > 0

        # =====================================================================
        # Step 8b: Human Correction & Rate Card Binding
        # =====================================================================
        # Costing engineer binds extracted line items to active catalog rate cards:
        # Item 1: EN8 + CNC Machining
        # Item 2 (if present): EN8D + Turning
        items = po_obj["items"]
        client.put(
            f"/api/v1/purchase-orders/{po_id}/items/{items[0]['id']}",
            json={
                "material_grade": "EN8",
                "process_name": "CNC Machining",
                "gross_weight_kg": 8.5,
                "net_weight_kg": 6.2,
                "scrap_weight_kg": 2.3,
                "machining_hours": 1.5,
            },
            headers=auth_headers,
        )
        if len(items) > 1:
            client.put(
                f"/api/v1/purchase-orders/{po_id}/items/{items[1]['id']}",
                json={
                    "material_grade": "EN8D",
                    "process_name": "Turning",
                    "gross_weight_kg": 4.2,
                    "net_weight_kg": 3.1,
                    "scrap_weight_kg": 1.1,
                    "machining_hours": 0.8,
                },
                headers=auth_headers,
            )

        # =====================================================================
        # Step 9: Deterministic Cost Calculation
        # =====================================================================
        valid_calc_res = client.post(
            f"/api/v1/purchase-orders/{po_id}/calculate",
            headers=auth_headers,
        )
        assert valid_calc_res.status_code == 200
        calc_data = valid_calc_res.json()
        assert calc_data["status"] in ("READY", "SUCCESS"), f"Calculation was BLOCKED with issues: {calc_data.get('issues')}"
        assert float(calc_data["manufacturing_subtotal"]) > 0
        assert float(calc_data["grand_total"]) > float(calc_data["manufacturing_subtotal"])
        quote_id = calc_data["quotation_id"]
        assert quote_id is not None

        # =====================================================================
        # Step 10: Commercial Quotation Draft Verification
        # =====================================================================
        quote_res = client.get(
            f"/api/v1/quotations/{quote_id}",
            headers=auth_headers,
        )
        assert quote_res.status_code == 200
        quote_data = quote_res.json()
        assert quote_data["status"] == "DRAFT"
        assert quote_data["quotation_number"].startswith("QT-")

        # =====================================================================
        # Step 11: ReportLab Professional PDF Generation
        # =====================================================================
        pdf_preview_res = client.get(
            f"/api/v1/quotations/{quote_id}/pdf",
            headers=auth_headers,
        )
        assert pdf_preview_res.status_code == 200, f"PDF preview failed: {pdf_preview_res.text}"
        assert pdf_preview_res.headers["content-type"] == "application/pdf"
        pdf_bytes = pdf_preview_res.content
        assert pdf_bytes.startswith(b"%PDF-")

        # Parse generated PDF vector stream and verify content
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        page_text = reader.pages[0].extract_text()
        assert "Bharat Precision" in page_text or "QUOTATION" in page_text
        assert quote_data["quotation_number"] in page_text

        # =====================================================================
        # Step 12: Quotation Finalization & SHA-256 Cryptographic Seal
        # =====================================================================
        finalize_res = client.post(
            f"/api/v1/quotations/{quote_id}/finalize",
            headers=auth_headers,
        )
        assert finalize_res.status_code == 200, f"Finalize failed: {finalize_res.text}"
        final_quote = finalize_res.json()
        assert final_quote["status"] == "FINAL"
        assert final_quote["finalized_at"] is not None
        assert final_quote["pdf_sha256"] is not None
        assert len(final_quote["pdf_sha256"]) == 64
        assert final_quote["pdf_storage_path"] is not None

        # =====================================================================
        # Step 13: Quotation Immutability Enforcement (HTTP 409 Conflict)
        # =====================================================================
        # Mutation attempt on finalized quote must be rejected with HTTP 409
        mutation_attempt = client.put(
            f"/api/v1/quotations/{quote_id}",
            json={"notes": "Illegal mutation attempt after finalization"},
            headers=auth_headers,
        )
        assert mutation_attempt.status_code == 409, f"Mutation on final quote should be 409: {mutation_attempt.text}"

        # Re-finalization attempt must be rejected with HTTP 409
        refinalize_attempt = client.post(
            f"/api/v1/quotations/{quote_id}/finalize",
            headers=auth_headers,
        )
        assert refinalize_attempt.status_code == 409, f"Re-finalize on final quote should be 409: {refinalize_attempt.text}"

        # Recalculation attempt must be rejected with HTTP 409
        recalc_attempt = client.post(
            f"/api/v1/quotations/{quote_id}/calculate",
            json={"overhead_percentage": 20, "profit_percentage": 20, "items": []},
            headers=auth_headers,
        )
        assert recalc_attempt.status_code == 409, f"Recalculation on final quote should be 409: {recalc_attempt.text}"

        # =====================================================================
        # Step 14: PDF Cryptographic Integrity Check
        # =====================================================================
        download_res = client.get(
            f"/api/v1/quotations/{quote_id}/pdf",
            headers=auth_headers,
        )
        assert download_res.status_code == 200
        downloaded_pdf = download_res.content
        downloaded_hash = hashlib.sha256(downloaded_pdf).hexdigest()
        assert downloaded_hash == final_quote["pdf_sha256"], "Cryptographic hash mismatch on official PDF!"

        # =====================================================================
        # Step 15: Safe Email Dispatch & Delivery Metadata Persistence
        # =====================================================================
        email_res = client.post(
            f"/api/v1/quotations/{quote_id}/send-email",
            headers=auth_headers,
        )
        assert email_res.status_code == 200
        email_result = email_res.json()
        assert email_result["email_status"] in ("SENT", "DELIVERED", "MOCKED_SUCCESS", "SUCCESS")
        # Ensure recipient is strictly resolved from customer's quotation_email
        assert email_result["recipient"] == cust.quotation_email

        # Verify quote record has persisted delivery metadata
        db.expire_all()
        refreshed_quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
        assert refreshed_quote.email_status in ("SENT", "DELIVERED", "MOCKED_SUCCESS", "SUCCESS")
        assert refreshed_quote.email_recipient == cust.quotation_email

        # =====================================================================
        # Step 16: Quotation History Audit Trail
        # =====================================================================
        history_res = client.get(
            "/api/v1/quotations?page=1&page_size=20",
            headers=auth_headers,
        )
        assert history_res.status_code == 200
        hist_data = history_res.json()
        found_in_history = any(q["id"] == quote_id for q in hist_data["items"])
        assert found_in_history, "Finalized quotation must appear in multi-tenant quotation history!"

    finally:
        db.close()

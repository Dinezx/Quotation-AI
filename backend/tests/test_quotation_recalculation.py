import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from jose import jwt, jwk
from jose.utils import base64url_encode
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

from app.main import app
from app.core.config import settings
from app.core.jwks import jwks_manager
from app.db.session import SessionLocal
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.services.calculation.calculation_service import CalculationService

client = TestClient(app)
RECALC_KID = "recalc-test-kid-2026"


@pytest.fixture(scope="module")
def auth_headers():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    numbers = public_key.public_numbers()
    x_bytes = numbers.x.to_bytes(32, byteorder="big")
    y_bytes = numbers.y.to_bytes(32, byteorder="big")

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "x": base64url_encode(x_bytes).decode("ascii"),
        "y": base64url_encode(y_bytes).decode("ascii"),
        "alg": "ES256",
        "use": "sig",
        "kid": RECALC_KID,
    }
    constructed_pub = jwk.construct(jwk_dict, algorithm="ES256")
    jwks_manager.register_test_key(RECALC_KID, constructed_pub)

    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    token_claims = {
        "sub": "usr-bpe-001",
        "iss": settings.SUPABASE_JWT_ISSUER,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": int(time.time()) + 3600,
        "role": "authenticated",
        "email": "r.deshmukh@bharatprecision.co.in",
    }
    token = jwt.encode(token_claims, pem_priv, algorithm="ES256", headers={"kid": RECALC_KID})
    return {"Authorization": f"Bearer {token}"}


def test_quotation_recalculation_synchronizes_all_items_and_header(auth_headers):
    """
    1. Create a quotation with 2 items with 0.00 values.
    2. Calculate the quotation via POST /api/v1/quotations/{id}/calculate.
    3. Reload the quotation from database.
    4. Verify every quotation item has populated calculated values.
    5. Verify quotation-level totals equal the sum of item calculations.
    """
    # Step 1: Create quotation with 2 items
    create_payload = {
        "quotation_number": f"QT-TEST-{int(time.time())}",
        "customer_id": "cust-mm-01",
        "currency": "INR",
        "overhead_percentage": 12.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "items": [
            {
                "item_number": 1,
                "part_name": "Precision CNC Flange",
                "specification": "SS 304",
                "quantity": 10.0,
                "unit": "PCS",
                "gross_material_cost": 0.0,
                "scrap_credit": 0.0,
                "net_material_cost": 0.0,
                "machining_cost": 0.0,
                "setup_cost": 0.0,
                "process_cost": 0.0,
                "subtotal": 0.0,
                "unit_cost": 0.0,
                "unit_price": 0.0,
                "total_price": 0.0,
            },
            {
                "item_number": 2,
                "part_name": "Guide Bushing EN8D",
                "specification": "EN8D",
                "quantity": 20.0,
                "unit": "PCS",
                "gross_material_cost": 0.0,
                "scrap_credit": 0.0,
                "net_material_cost": 0.0,
                "machining_cost": 0.0,
                "setup_cost": 0.0,
                "process_cost": 0.0,
                "subtotal": 0.0,
                "unit_cost": 0.0,
                "unit_price": 0.0,
                "total_price": 0.0,
            },
        ],
    }

    create_res = client.post("/api/v1/quotations", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    created_q = create_res.json()
    quotation_id = created_q["id"]
    assert len(created_q["items"]) == 2
    assert Decimal(str(created_q["items"][0]["subtotal"])) == Decimal("0.00")
    assert Decimal(str(created_q["items"][1]["subtotal"])) == Decimal("0.00")

    # Step 2: Calculate the quotation
    calc_payload = {
        "items": [
            {
                "item_number": 1,
                "part_name": "Precision CNC Flange",
                "specification": "SS 304",
                "quantity": 10.0,
                "unit": "PCS",
                "gross_weight_kg": 12.0,
                "scrap_weight_kg": 4.0,
                "material_base_rate": 380.0,
                "scrap_credit_rate": 140.0,
                "machining_hours": 2.5,
                "machine_hourly_rate": 1200.0,
                "setup_cost": 500.0,
            },
            {
                "item_number": 2,
                "part_name": "Guide Bushing EN8D",
                "specification": "EN8D",
                "quantity": 20.0,
                "unit": "PCS",
                "gross_weight_kg": 2.0,
                "scrap_weight_kg": 0.5,
                "material_base_rate": 125.0,
                "scrap_credit_rate": 45.0,
                "machining_hours": 0.5,
                "machine_hourly_rate": 850.0,
                "setup_cost": 400.0,
            },
        ],
        "overhead_percentage": 12.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
    }

    calc_res = client.post(
        f"/api/v1/quotations/{quotation_id}/calculate",
        json=calc_payload,
        headers=auth_headers
    )
    assert calc_res.status_code == 200, calc_res.text
    calc_data = calc_res.json()

    # Step 3: Reload quotation from database directly
    db = SessionLocal()
    try:
        db_q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        assert db_q is not None
        assert len(db_q.items) == 2

        # Step 4: Verify every quotation item has populated calculated values
        item1 = next(it for it in db_q.items if it.item_number == 1)
        item2 = next(it for it in db_q.items if it.item_number == 2)

        # Item 1 calculations:
        # Gross mat = 12 * 380 * 10 = 45,600; Scrap = 4 * 140 * 10 = 5,600 -> Net mat = 40,000.00
        # Machining = 2.5 * 1200 * 10 = 30,000; Setup = 500 -> Process = 30,500.00
        # Subtotal = 70,500.00; Unit cost = 7,050.00; Unit price = 7,050.00; Total price = 70,500.00
        assert item1.gross_material_cost == Decimal("45600.00")
        assert item1.scrap_credit == Decimal("5600.00")
        assert item1.net_material_cost == Decimal("40000.00")
        assert item1.machining_cost == Decimal("30000.00")
        assert item1.setup_cost == Decimal("500.00")
        assert item1.process_cost == Decimal("30500.00")
        assert item1.subtotal == Decimal("70500.00")
        assert item1.unit_cost == Decimal("7050.00")
        assert item1.unit_price == Decimal("7050.00")
        assert item1.total_price == Decimal("70500.00")

        # Item 2 calculations:
        # Gross mat = 2 * 125 * 20 = 5,000; Scrap = 0.5 * 45 * 20 = 450 -> Net mat = 4,550.00
        # Machining = 0.5 * 850 * 20 = 8,500; Setup = 400 -> Process = 8,900.00
        # Subtotal = 13,450.00; Unit cost = 672.50; Unit price = 672.50; Total price = 13,450.00
        assert item2.gross_material_cost == Decimal("5000.00")
        assert item2.scrap_credit == Decimal("450.00")
        assert item2.net_material_cost == Decimal("4550.00")
        assert item2.machining_cost == Decimal("8500.00")
        assert item2.setup_cost == Decimal("400.00")
        assert item2.process_cost == Decimal("8900.00")
        assert item2.subtotal == Decimal("13450.00")
        assert item2.unit_cost == Decimal("672.50")
        assert item2.unit_price == Decimal("672.50")
        assert item2.total_price == Decimal("13450.00")

        # Step 5: Verify quotation-level totals equal sum of item calculations
        expected_material_cost = item1.net_material_cost + item2.net_material_cost
        expected_process_cost = item1.process_cost + item2.process_cost
        expected_subtotal = item1.subtotal + item2.subtotal

        assert db_q.material_cost == expected_material_cost
        assert db_q.material_cost == Decimal("44550.00")
        assert db_q.process_cost == expected_process_cost
        assert db_q.process_cost == Decimal("39400.00")
        assert db_q.subtotal == expected_subtotal
        assert db_q.subtotal == Decimal("83950.00")

        # Overhead: 83950 * 0.12 = 10074.00
        assert db_q.overhead_amount == Decimal("10074.00")
        # Profit: (83950 + 10074) * 0.15 = 94024 * 0.15 = 14103.6 -> 14104.00
        assert db_q.profit_amount == Decimal("14104.00")
        # Taxable: 94024 + 14104 = 108128.00
        assert db_q.taxable_amount == Decimal("108128.00")
        # GST @ 9% CGST + 9% SGST: 108128 * 0.09 = 9731.52 -> 9732.00 each
        assert db_q.cgst_amount == Decimal("9732.00")
        assert db_q.sgst_amount == Decimal("9732.00")
        assert db_q.gst_amount == Decimal("19464.00")
        # Final Total: 108128 + 19464 = 127592.00
        assert db_q.final_total == Decimal("127592.00")

    finally:
        db.close()


def test_quotation_recalculation_replaces_stale_values(auth_headers):
    """
    6. Recalculate after changing an input/rate.
    7. Verify old item values are replaced rather than remaining stale.
    """
    # Create quotation with 1 item
    create_payload = {
        "quotation_number": f"QT-STALE-{int(time.time())}",
        "customer_id": "cust-mm-01",
        "currency": "INR",
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "items": [
            {
                "item_number": 1,
                "part_name": "Machined Shaft",
                "specification": "EN8D",
                "quantity": 5.0,
                "unit": "PCS",
                "subtotal": 0.0,
            }
        ],
    }
    create_res = client.post("/api/v1/quotations", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    q_id = create_res.json()["id"]

    # Initial calculation: rate 100.0, hours 1.0
    calc_payload_1 = {
        "items": [
            {
                "item_number": 1,
                "part_name": "Machined Shaft",
                "specification": "EN8D",
                "quantity": 5.0,
                "unit": "PCS",
                "gross_weight_kg": 10.0,
                "scrap_weight_kg": 2.0,
                "material_base_rate": 100.0,
                "scrap_credit_rate": 20.0,
                "machining_hours": 1.0,
                "machine_hourly_rate": 500.0,
                "setup_cost": 200.0,
            }
        ],
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
    }
    # Net mat: (10 * 100 * 5) - (2 * 20 * 5) = 5000 - 200 = 4800
    # Process: (1 * 500 * 5) + 200 = 2700
    # Subtotal: 7500.00
    res_1 = client.post(f"/api/v1/quotations/{q_id}/calculate", json=calc_payload_1, headers=auth_headers)
    assert res_1.status_code == 200
    assert Decimal(str(res_1.json()["items"][0]["subtotal"])) == Decimal("7500.00")

    # Step 6: Recalculate with modified rates: rate 200.0, hours 2.0
    calc_payload_2 = {
        "items": [
            {
                "item_number": 1,
                "part_name": "Machined Shaft",
                "specification": "EN8D",
                "quantity": 5.0,
                "unit": "PCS",
                "gross_weight_kg": 10.0,
                "scrap_weight_kg": 2.0,
                "material_base_rate": 200.0,  # Doubled
                "scrap_credit_rate": 20.0,
                "machining_hours": 2.0,        # Doubled
                "machine_hourly_rate": 500.0,
                "setup_cost": 200.0,
            }
        ],
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
    }
    # New Net mat: (10 * 200 * 5) - (2 * 20 * 5) = 10000 - 200 = 9800.00
    # New Process: (2 * 500 * 5) + 200 = 5200.00
    # New Subtotal: 15000.00
    res_2 = client.post(f"/api/v1/quotations/{q_id}/calculate", json=calc_payload_2, headers=auth_headers)
    assert res_2.status_code == 200
    updated_q = res_2.json()

    # Step 7: Verify old values are completely replaced in DB
    db = SessionLocal()
    try:
        db_q = db.query(Quotation).filter(Quotation.id == q_id).first()
        assert len(db_q.items) == 1
        refreshed_item = db_q.items[0]

        assert refreshed_item.net_material_cost == Decimal("9800.00")
        assert refreshed_item.process_cost == Decimal("5200.00")
        assert refreshed_item.subtotal == Decimal("15000.00")
        assert refreshed_item.unit_cost == Decimal("3000.00")
        assert refreshed_item.unit_price == Decimal("3000.00")
        assert refreshed_item.total_price == Decimal("15000.00")

        # Confirm old values no longer exist
        assert refreshed_item.subtotal != Decimal("7500.00")
        assert db_q.subtotal == Decimal("15000.00")
    finally:
        db.close()


def test_calculation_failure_rolls_back_atomically(auth_headers, monkeypatch):
    """
    8. Verify a calculation failure does not leave partial updates.
    """
    # Create and calculate a valid quotation first
    create_payload = {
        "quotation_number": f"QT-ROLLBACK-{int(time.time())}",
        "customer_id": "cust-mm-01",
        "currency": "INR",
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "items": [
            {
                "item_number": 1,
                "part_name": "Base Bushing",
                "quantity": 10.0,
                "unit": "PCS",
                "subtotal": 0.0,
            }
        ],
    }
    create_res = client.post("/api/v1/quotations", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    q_id = create_res.json()["id"]

    valid_calc_payload = {
        "items": [
            {
                "item_number": 1,
                "part_name": "Base Bushing",
                "quantity": 10.0,
                "unit": "PCS",
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 1.0,
                "material_base_rate": 100.0,
                "scrap_credit_rate": 20.0,
                "machining_hours": 1.0,
                "machine_hourly_rate": 500.0,
                "setup_cost": 100.0,
            }
        ],
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
    }
    res_valid = client.post(f"/api/v1/quotations/{q_id}/calculate", json=valid_calc_payload, headers=auth_headers)
    assert res_valid.status_code == 200

    # Capture state before simulated failure
    db = SessionLocal()
    try:
        pre_fail_q = db.query(Quotation).filter(Quotation.id == q_id).first()
        pre_fail_subtotal = pre_fail_q.subtotal
        pre_fail_item_subtotal = pre_fail_q.items[0].subtotal
        assert pre_fail_subtotal > Decimal("0.00")
    finally:
        db.close()

    # Simulate an error during CalculationService.calculate_quotation
    def mock_fail_calculate(*args, **kwargs):
        raise RuntimeError("Simulated calculation engine hardware error")

    monkeypatch.setattr(CalculationService, "calculate_quotation", mock_fail_calculate)

    # Attempt recalculation which triggers the exception
    fail_res = client.post(f"/api/v1/quotations/{q_id}/calculate", json=valid_calc_payload, headers=auth_headers)
    assert fail_res.status_code == 400
    assert "Simulated calculation engine hardware error" in fail_res.json()["detail"]

    # Verify database state was NOT modified partially
    db2 = SessionLocal()
    try:
        post_fail_q = db2.query(Quotation).filter(Quotation.id == q_id).first()
        assert post_fail_q.subtotal == pre_fail_subtotal
        assert post_fail_q.items[0].subtotal == pre_fail_item_subtotal
    finally:
        db2.close()

import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    with httpx.Client(timeout=5.0) as client:
        res = client.get(f"{BASE_URL}/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

def test_auth_me():
    with httpx.Client(timeout=5.0) as client:
        res = client.get(f"{BASE_URL}/api/v1/auth/me")
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["company_id"] == "comp-bpe-pune"
        assert "Bharat Precision" in data["company"]["name"]

def test_rates_materials():
    with httpx.Client(timeout=5.0) as client:
        res = client.get(f"{BASE_URL}/api/v1/rates/materials")
        assert res.status_code == 200
        materials = res.json()
        assert len(materials) >= 5
        grades = [m["grade"] for m in materials]
        assert "SS 304" in grades
        assert "EN8D" in grades

def test_rates_processes():
    with httpx.Client(timeout=5.0) as client:
        res = client.get(f"{BASE_URL}/api/v1/rates/processes")
        assert res.status_code == 200
        processes = res.json()
        assert len(processes) >= 4

def test_customers_crud():
    with httpx.Client(timeout=5.0) as client:
        # List
        res = client.get(f"{BASE_URL}/api/v1/customers")
        assert res.status_code == 200
        customers = res.json()
        assert len(customers) >= 1

def test_quotations_calculation_endpoint():
    with httpx.Client(timeout=5.0) as client:
        payload = {
            "items": [
                {
                    "part_name": "CNC Flange",
                    "quantity": 10,
                    "unit": "PCS",
                    "gross_weight_kg": 12.0,
                    "scrap_weight_kg": 4.0,
                    "material_base_rate": 380.0,
                    "scrap_credit_rate": 140.0,
                    "machining_hours": 2.5,
                    "machine_hourly_rate": 1200.0,
                    "setup_cost": 500.0,
                }
            ],
            "overhead_percentage": 12,
            "profit_percentage": 15,
            "gst_type": "CGST_SGST",
        }
        res = client.post(f"{BASE_URL}/api/v1/quotations/calculate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["material_cost"] == 40000.0
        assert data["process_cost"] == 30500.0
        assert data["subtotal"] == 70500.0
        assert data["overhead_amount"] == 8460.0
        assert data["profit_amount"] == 11844.0
        assert data["taxable_amount"] == 90804.0
        assert data["cgst_amount"] == 8172.0
        assert data["sgst_amount"] == 8172.0
        assert data["final_total"] == 107148.0
        assert "Indian Rupee" in data["final_total_in_words"]

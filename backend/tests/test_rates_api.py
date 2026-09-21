import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ----------------- MATERIALS -----------------

def test_materials_crud_lifecycle(auth_headers):
    """Test full CRUD lifecycle for material rate cards under current company."""
    unique_grade = f"AL-{int(time.time())}"
    payload = {
        "name": f"Aluminium Alloy {unique_grade}",
        "grade": unique_grade,
        "density": 2.70,
        "unit": "kg",
        "base_rate": 320.00,
        "scrap_credit_rate": 110.00,
        "is_active": True,
    }

    # 1. Create
    res_create = client.post("/api/v1/rates/materials", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    mat = res_create.json()
    mat_id = mat["id"]
    assert mat["grade"] == unique_grade
    assert Decimal(str(mat["base_rate"])) == Decimal("320.00")

    # 2. List
    res_list = client.get("/api/v1/rates/materials", headers=auth_headers)
    assert res_list.status_code == 200
    grades = [m["grade"] for m in res_list.json()]
    assert unique_grade in grades

    # 3. Update
    update_payload = {
        "base_rate": 350.00,
        "scrap_credit_rate": 120.00,
    }
    res_update = client.put(f"/api/v1/rates/materials/{mat_id}", json=update_payload, headers=auth_headers)
    assert res_update.status_code == 200
    updated_mat = res_update.json()
    assert Decimal(str(updated_mat["base_rate"])) == Decimal("350.00")
    assert Decimal(str(updated_mat["scrap_credit_rate"])) == Decimal("120.00")

    # 4. Deactivate (Delete)
    res_del = client.delete(f"/api/v1/rates/materials/{mat_id}", headers=auth_headers)
    assert res_del.status_code == 204

    # 5. Verify excluded from active list
    res_list_after = client.get("/api/v1/rates/materials", headers=auth_headers)
    grades_after = [m["grade"] for m in res_list_after.json()]
    assert unique_grade not in grades_after


def test_nonexistent_material_404(auth_headers):
    """Test updating or deleting nonexistent material ID returns 404."""
    ghost_id = "mat-00000000-0000-0000-0000-000000000000"
    res_put = client.put(f"/api/v1/rates/materials/{ghost_id}", json={"base_rate": 100}, headers=auth_headers)
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "Material rate card not found"

    res_del = client.delete(f"/api/v1/rates/materials/{ghost_id}", headers=auth_headers)
    assert res_del.status_code == 404


def test_cross_company_material_access_rejected(auth_headers, auth_headers_company_b):
    """Test multi-tenancy isolation: Company B cannot modify or delete Company A's material."""
    unique_grade = f"SS-TENANT-A-{int(time.time())}"
    res_a = client.post(
        "/api/v1/rates/materials",
        json={
            "name": f"Special Alloy {unique_grade}",
            "grade": unique_grade,
            "density": 8.0,
            "unit": "kg",
            "base_rate": 500.0,
            "scrap_credit_rate": 150.0,
        },
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    mat_a_id = res_a.json()["id"]

    # Company B attempts to update
    res_b_put = client.put(
        f"/api/v1/rates/materials/{mat_a_id}",
        json={"base_rate": 10.0},
        headers=auth_headers_company_b,
    )
    assert res_b_put.status_code == 404

    # Company B attempts to delete
    res_b_del = client.delete(f"/api/v1/rates/materials/{mat_a_id}", headers=auth_headers_company_b)
    assert res_b_del.status_code == 404

    # Company B listing must not contain Company A's unique material
    res_b_list = client.get("/api/v1/rates/materials", headers=auth_headers_company_b)
    assert res_b_list.status_code == 200
    b_grades = [m["grade"] for m in res_b_list.json()]
    assert unique_grade not in b_grades


# ----------------- PROCESSES -----------------

def test_processes_crud_lifecycle(auth_headers):
    """Test full CRUD lifecycle for process rate cards under current company."""
    unique_proc = f"Laser Engraving {int(time.time())}"
    payload = {
        "name": unique_proc,
        "unit": "hour",
        "hourly_rate": 600.00,
        "setup_cost": 150.00,
        "is_active": True,
    }

    # 1. Create
    res_create = client.post("/api/v1/rates/processes", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    proc = res_create.json()
    proc_id = proc["id"]
    assert proc["name"] == unique_proc
    assert Decimal(str(proc["hourly_rate"])) == Decimal("600.00")

    # 2. List
    res_list = client.get("/api/v1/rates/processes", headers=auth_headers)
    assert res_list.status_code == 200
    names = [p["name"] for p in res_list.json()]
    assert unique_proc in names

    # 3. Update
    update_payload = {
        "hourly_rate": 650.00,
        "setup_cost": 200.00,
    }
    res_update = client.put(f"/api/v1/rates/processes/{proc_id}", json=update_payload, headers=auth_headers)
    assert res_update.status_code == 200
    updated_proc = res_update.json()
    assert Decimal(str(updated_proc["hourly_rate"])) == Decimal("650.00")
    assert Decimal(str(updated_proc["setup_cost"])) == Decimal("200.00")

    # 4. Deactivate
    res_del = client.delete(f"/api/v1/rates/processes/{proc_id}", headers=auth_headers)
    assert res_del.status_code == 204

    # 5. Excluded from list
    res_list_after = client.get("/api/v1/rates/processes", headers=auth_headers)
    names_after = [p["name"] for p in res_list_after.json()]
    assert unique_proc not in names_after


def test_nonexistent_process_404(auth_headers):
    """Test updating or deleting nonexistent process ID returns 404."""
    ghost_id = "proc-00000000-0000-0000-0000-000000000000"
    res_put = client.put(f"/api/v1/rates/processes/{ghost_id}", json={"hourly_rate": 500}, headers=auth_headers)
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "Process rate card not found"

    res_del = client.delete(f"/api/v1/rates/processes/{ghost_id}", headers=auth_headers)
    assert res_del.status_code == 404


def test_cross_company_process_access_rejected(auth_headers, auth_headers_company_b):
    """Test multi-tenancy isolation: Company B cannot modify or delete Company A's process."""
    unique_name = f"Confidential EDM {int(time.time())}"
    res_a = client.post(
        "/api/v1/rates/processes",
        json={"name": unique_name, "unit": "hour", "hourly_rate": 1500.0, "setup_cost": 300.0},
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    proc_a_id = res_a.json()["id"]

    # Company B attempts update
    res_b_put = client.put(
        f"/api/v1/rates/processes/{proc_a_id}",
        json={"hourly_rate": 100.0},
        headers=auth_headers_company_b,
    )
    assert res_b_put.status_code == 404

    # Company B attempts delete
    res_b_del = client.delete(f"/api/v1/rates/processes/{proc_a_id}", headers=auth_headers_company_b)
    assert res_b_del.status_code == 404

    # Company B listing must not contain Company A's process
    res_b_list = client.get("/api/v1/rates/processes", headers=auth_headers_company_b)
    assert res_b_list.status_code == 200
    b_names = [p["name"] for p in res_b_list.json()]
    assert unique_name not in b_names


# ----------------- VALIDATION & UNICITY -----------------

def test_material_validation_negative_rates_rejected(auth_headers):
    """Test that negative base rate or negative scrap credit is rejected with 422."""
    res_neg_base = client.post(
        "/api/v1/rates/materials",
        json={"name": "Steel", "grade": "MS-NEG-1", "base_rate": -10.00, "scrap_credit_rate": 5.00},
        headers=auth_headers,
    )
    assert res_neg_base.status_code == 422

    res_neg_scrap = client.post(
        "/api/v1/rates/materials",
        json={"name": "Steel", "grade": "MS-NEG-2", "base_rate": 80.00, "scrap_credit_rate": -5.00},
        headers=auth_headers,
    )
    assert res_neg_scrap.status_code == 422


def test_material_validation_empty_grade_or_name(auth_headers):
    """Test that empty or whitespace-only grade or name is rejected with 422."""
    res_empty_name = client.post(
        "/api/v1/rates/materials",
        json={"name": "   ", "grade": "MS-BLANK", "base_rate": 80.00},
        headers=auth_headers,
    )
    assert res_empty_name.status_code == 422

    res_empty_grade = client.post(
        "/api/v1/rates/materials",
        json={"name": "Valid Material", "grade": "   ", "base_rate": 80.00},
        headers=auth_headers,
    )
    assert res_empty_grade.status_code == 422


def test_material_duplicate_grade_rejected_same_company(auth_headers):
    """Test that duplicate material grade within the same company returns 409 Conflict."""
    unique_grade = f"UNIQ-GRADE-{int(time.time())}"
    res_first = client.post(
        "/api/v1/rates/materials",
        json={"name": "Test Material", "grade": unique_grade, "base_rate": 100.00},
        headers=auth_headers,
    )
    assert res_first.status_code == 201

    # Attempt second with exact grade
    res_dup = client.post(
        "/api/v1/rates/materials",
        json={"name": "Duplicate Material", "grade": unique_grade, "base_rate": 120.00},
        headers=auth_headers,
    )
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.json()["detail"].lower()

    # Attempt case-insensitive duplicate
    res_case_dup = client.post(
        "/api/v1/rates/materials",
        json={"name": "Case Duplicate", "grade": unique_grade.lower(), "base_rate": 130.00},
        headers=auth_headers,
    )
    assert res_case_dup.status_code == 409


def test_material_duplicate_grade_allowed_across_companies(auth_headers, auth_headers_company_b):
    """Test that two different companies can independently use the same material grade."""
    shared_grade = f"SHARED-SPEC-{int(time.time())}"
    res_a = client.post(
        "/api/v1/rates/materials",
        json={"name": "Company A Spec", "grade": shared_grade, "base_rate": 90.00},
        headers=auth_headers,
    )
    assert res_a.status_code == 201

    res_b = client.post(
        "/api/v1/rates/materials",
        json={"name": "Company B Spec", "grade": shared_grade, "base_rate": 115.00},
        headers=auth_headers_company_b,
    )
    assert res_b.status_code == 201


def test_material_reactivate_and_include_inactive(auth_headers):
    """Test deactivating, listing with include_inactive, and reactivating material."""
    unique_grade = f"REACT-MAT-{int(time.time())}"
    res = client.post(
        "/api/v1/rates/materials",
        json={"name": "Reactivate Test", "grade": unique_grade, "base_rate": 150.00},
        headers=auth_headers,
    )
    assert res.status_code == 201
    mat_id = res.json()["id"]

    # Deactivate
    res_del = client.delete(f"/api/v1/rates/materials/{mat_id}", headers=auth_headers)
    assert res_del.status_code == 204

    # Default list excludes it
    res_active = client.get("/api/v1/rates/materials", headers=auth_headers)
    assert unique_grade not in [m["grade"] for m in res_active.json()]

    # Listing with include_inactive=true includes it
    res_all = client.get("/api/v1/rates/materials?include_inactive=true", headers=auth_headers)
    assert res_all.status_code == 200
    all_mats = res_all.json()
    target_mat = next((m for m in all_mats if m["id"] == mat_id), None)
    assert target_mat is not None
    assert target_mat["is_active"] is False

    # Reactivate
    res_react = client.post(f"/api/v1/rates/materials/{mat_id}/reactivate", headers=auth_headers)
    assert res_react.status_code == 200
    assert res_react.json()["is_active"] is True

    # Active list now includes it
    res_active_now = client.get("/api/v1/rates/materials", headers=auth_headers)
    assert unique_grade in [m["grade"] for m in res_active_now.json()]


def test_process_validation_negative_rates_rejected(auth_headers):
    """Test that negative hourly rate or setup cost is rejected with 422."""
    res_neg_rate = client.post(
        "/api/v1/rates/processes",
        json={"name": "Neg Rate Machine", "hourly_rate": -50.00, "setup_cost": 100.00},
        headers=auth_headers,
    )
    assert res_neg_rate.status_code == 422

    res_neg_setup = client.post(
        "/api/v1/rates/processes",
        json={"name": "Neg Setup Machine", "hourly_rate": 500.00, "setup_cost": -20.00},
        headers=auth_headers,
    )
    assert res_neg_setup.status_code == 422


def test_process_duplicate_name_rejected_same_company(auth_headers):
    """Test that duplicate process name within same company returns 409 Conflict."""
    unique_proc = f"VMC Operation {int(time.time())}"
    res_first = client.post(
        "/api/v1/rates/processes",
        json={"name": unique_proc, "hourly_rate": 800.00},
        headers=auth_headers,
    )
    assert res_first.status_code == 201

    res_dup = client.post(
        "/api/v1/rates/processes",
        json={"name": unique_proc.lower(), "hourly_rate": 900.00},
        headers=auth_headers,
    )
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.json()["detail"].lower()


def test_process_reactivate_and_include_inactive(auth_headers):
    """Test deactivating, listing with include_inactive, and reactivating process."""
    unique_name = f"Reactivate Process {int(time.time())}"
    res = client.post(
        "/api/v1/rates/processes",
        json={"name": unique_name, "hourly_rate": 450.00, "setup_cost": 50.00},
        headers=auth_headers,
    )
    assert res.status_code == 201
    proc_id = res.json()["id"]

    # Deactivate
    client.delete(f"/api/v1/rates/processes/{proc_id}", headers=auth_headers)

    # Active list excludes it
    res_active = client.get("/api/v1/rates/processes", headers=auth_headers)
    assert unique_name not in [p["name"] for p in res_active.json()]

    # Listing with include_inactive=true includes it
    res_all = client.get("/api/v1/rates/processes?include_inactive=true", headers=auth_headers)
    target_proc = next((p for p in res_all.json() if p["id"] == proc_id), None)
    assert target_proc is not None
    assert target_proc["is_active"] is False

    # Reactivate
    res_react = client.post(f"/api/v1/rates/processes/{proc_id}/reactivate", headers=auth_headers)
    assert res_react.status_code == 200
    assert res_react.json()["is_active"] is True

    # Active list now includes it
    res_active_now = client.get("/api/v1/rates/processes", headers=auth_headers)
    assert unique_name in [p["name"] for p in res_active_now.json()]


# ----------------- PRICING RULES -----------------

def test_pricing_rules_lifecycle_and_tenant_isolation(auth_headers, auth_headers_company_b):
    """Test getting, updating pricing rules in company.settings and multi-tenancy isolation."""
    # 1. Get current pricing rules
    res_get = client.get("/api/v1/rates/pricing-rules", headers=auth_headers)
    assert res_get.status_code == 200
    rules = res_get.json()
    assert "overhead_percentage" in rules
    assert "profit_percentage" in rules
    assert "gst_type" in rules

    # 2. Update pricing rules for Company A
    update_payload = {
        "overhead_percentage": 14.50,
        "profit_percentage": 18.00,
        "gst_type": "IGST",
        "default_gst_rate": 18.00,
    }
    res_put = client.put("/api/v1/rates/pricing-rules", json=update_payload, headers=auth_headers)
    assert res_put.status_code == 200
    updated = res_put.json()
    assert Decimal(str(updated["overhead_percentage"])) == Decimal("14.50")
    assert Decimal(str(updated["profit_percentage"])) == Decimal("18.00")
    assert updated["gst_type"] == "IGST"

    # Verify persisted via GET
    res_get_updated = client.get("/api/v1/rates/pricing-rules", headers=auth_headers)
    assert res_get_updated.status_code == 200
    assert Decimal(str(res_get_updated.json()["overhead_percentage"])) == Decimal("14.50")

    # 3. Multi-tenancy check: Company B cannot see Company A's rules
    res_b_get = client.get("/api/v1/rates/pricing-rules", headers=auth_headers_company_b)
    assert res_b_get.status_code == 200
    # Company B's overhead is different (or default)
    assert Decimal(str(res_b_get.json()["overhead_percentage"])) != Decimal("14.50")

    # 4. Validation tests
    # Negative overhead rejected
    res_neg_ovh = client.put(
        "/api/v1/rates/pricing-rules",
        json={"overhead_percentage": -5.00, "profit_percentage": 15.00, "gst_type": "CGST_SGST"},
        headers=auth_headers,
    )
    assert res_neg_ovh.status_code == 422

    # Invalid GST type rejected
    res_inv_gst = client.put(
        "/api/v1/rates/pricing-rules",
        json={"overhead_percentage": 10.00, "profit_percentage": 15.00, "gst_type": "INVALID_GST_MODE"},
        headers=auth_headers,
    )
    assert res_inv_gst.status_code == 422

    # Restore standard values
    client.put(
        "/api/v1/rates/pricing-rules",
        json={"overhead_percentage": 10.00, "profit_percentage": 15.00, "gst_type": "CGST_SGST", "default_gst_rate": 18.00},
        headers=auth_headers,
    )


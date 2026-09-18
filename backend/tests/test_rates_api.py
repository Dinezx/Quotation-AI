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

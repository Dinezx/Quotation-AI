from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import get_current_company_id
from app.db.session import get_db
from app.models.company import Company
from app.models.material import Material
from app.models.process import Process
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.schemas.process import ProcessCreate, ProcessUpdate, ProcessResponse
from app.schemas.pricing import PricingRulesResponse, PricingRulesUpdate

router = APIRouter(prefix="/rates", tags=["Rate Cards"])

# ----------------- MATERIALS -----------------

@router.get("/materials", response_model=List[MaterialResponse])
def list_materials(
    include_inactive: bool = Query(default=False, description="Include deactivated materials in list"),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List material rate cards for the current company."""
    query = db.query(Material).filter(Material.company_id == company_id)
    if not include_inactive:
        query = query.filter(Material.is_active == True)
    return query.order_by(Material.grade.asc()).all()


@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material_in: MaterialCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new material rate card. Enforces tenant grade uniqueness."""
    clean_grade = material_in.grade.strip()
    
    # Check for duplicate grade within the same company
    existing = db.query(Material).filter(
        Material.company_id == company_id,
        func.lower(Material.grade) == clean_grade.lower(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Material grade '{clean_grade}' already exists for this company.",
        )

    material = Material(
        company_id=company_id,
        name=material_in.name.strip(),
        grade=clean_grade,
        density=material_in.density,
        unit=material_in.unit.strip() if material_in.unit else "kg",
        base_rate=material_in.base_rate,
        scrap_credit_rate=material_in.scrap_credit_rate,
        is_active=material_in.is_active,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/materials/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Get single material rate card."""
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.company_id == company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material rate card not found")
    return material


@router.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: str,
    material_in: MaterialUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update an existing material rate card."""
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.company_id == company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material rate card not found")

    # If grade is updated, ensure no collision with another material in the same company
    if material_in.grade is not None:
        clean_grade = material_in.grade.strip()
        existing = db.query(Material).filter(
            Material.company_id == company_id,
            Material.id != material_id,
            func.lower(Material.grade) == clean_grade.lower(),
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Material grade '{clean_grade}' already exists for this company.",
            )

    update_data = material_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        update_data["name"] = update_data["name"].strip()
    if "grade" in update_data and update_data["grade"]:
        update_data["grade"] = update_data["grade"].strip()
    if "unit" in update_data and update_data["unit"]:
        update_data["unit"] = update_data["unit"].strip()

    for field, value in update_data.items():
        setattr(material, field, value)

    db.commit()
    db.refresh(material)
    return material


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Deactivate a material rate card."""
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.company_id == company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material rate card not found")
    
    material.is_active = False
    db.commit()
    return None


@router.post("/materials/{material_id}/reactivate", response_model=MaterialResponse)
def reactivate_material(
    material_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Reactivate a previously deactivated material rate card."""
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.company_id == company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material rate card not found")
    
    material.is_active = True
    db.commit()
    db.refresh(material)
    return material


# ----------------- PROCESSES -----------------

@router.get("/processes", response_model=List[ProcessResponse])
def list_processes(
    include_inactive: bool = Query(default=False, description="Include deactivated processes in list"),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List all machine & workstation process rate cards for current company."""
    query = db.query(Process).filter(Process.company_id == company_id)
    if not include_inactive:
        query = query.filter(Process.is_active == True)
    return query.order_by(Process.name.asc()).all()


@router.post("/processes", response_model=ProcessResponse, status_code=status.HTTP_201_CREATED)
def create_process(
    process_in: ProcessCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new process rate card. Enforces tenant process name uniqueness."""
    clean_name = process_in.name.strip()
    
    # Check for duplicate process name within the same company
    existing = db.query(Process).filter(
        Process.company_id == company_id,
        func.lower(Process.name) == clean_name.lower(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Process '{clean_name}' already exists for this company.",
        )

    process = Process(
        company_id=company_id,
        name=clean_name,
        unit=process_in.unit.strip() if process_in.unit else "hour",
        hourly_rate=process_in.hourly_rate,
        setup_cost=process_in.setup_cost,
        is_active=process_in.is_active,
    )
    db.add(process)
    db.commit()
    db.refresh(process)
    return process


@router.get("/processes/{process_id}", response_model=ProcessResponse)
def get_process(
    process_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Get single process rate card."""
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process rate card not found")
    return process


@router.put("/processes/{process_id}", response_model=ProcessResponse)
def update_process(
    process_id: str,
    process_in: ProcessUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update an existing process rate card."""
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process rate card not found")

    # If name is updated, ensure no collision with another process in the same company
    if process_in.name is not None:
        clean_name = process_in.name.strip()
        existing = db.query(Process).filter(
            Process.company_id == company_id,
            Process.id != process_id,
            func.lower(Process.name) == clean_name.lower(),
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Process '{clean_name}' already exists for this company.",
            )

    update_data = process_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        update_data["name"] = update_data["name"].strip()
    if "unit" in update_data and update_data["unit"]:
        update_data["unit"] = update_data["unit"].strip()

    for field, value in update_data.items():
        setattr(process, field, value)

    db.commit()
    db.refresh(process)
    return process


@router.delete("/processes/{process_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(
    process_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Deactivate a process rate card."""
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process rate card not found")
    
    process.is_active = False
    db.commit()
    return None


@router.post("/processes/{process_id}/reactivate", response_model=ProcessResponse)
def reactivate_process(
    process_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Reactivate a previously deactivated process rate card."""
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process rate card not found")
    
    process.is_active = True
    db.commit()
    db.refresh(process)
    return process


# ----------------- PRICING RULES -----------------

@router.get("/pricing-rules", response_model=PricingRulesResponse)
def get_pricing_rules(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve tenant commercial pricing rules (Overhead %, Profit %, GST config)."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    settings = company.settings or {}
    return PricingRulesResponse(
        overhead_percentage=Decimal(str(settings.get("overhead_percentage", "10.00"))),
        profit_percentage=Decimal(str(settings.get("profit_percentage", "15.00"))),
        gst_type=str(settings.get("gst_type", "CGST_SGST")),
        default_gst_rate=Decimal(str(settings.get("default_gst_rate", "18.00"))),
    )


@router.put("/pricing-rules", response_model=PricingRulesResponse)
def update_pricing_rules(
    rules_in: PricingRulesUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update tenant commercial pricing rules (Overhead %, Profit %, GST config)."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    settings = dict(company.settings or {})
    settings["overhead_percentage"] = float(rules_in.overhead_percentage)
    settings["profit_percentage"] = float(rules_in.profit_percentage)
    settings["gst_type"] = rules_in.gst_type
    settings["default_gst_rate"] = float(rules_in.default_gst_rate)

    company.settings = settings
    db.commit()
    db.refresh(company)

    return PricingRulesResponse(
        overhead_percentage=rules_in.overhead_percentage,
        profit_percentage=rules_in.profit_percentage,
        gst_type=rules_in.gst_type,
        default_gst_rate=rules_in.default_gst_rate,
    )

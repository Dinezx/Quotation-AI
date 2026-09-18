from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import get_current_company_id
from app.db.session import get_db
from app.models.material import Material
from app.models.process import Process
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.schemas.process import ProcessCreate, ProcessUpdate, ProcessResponse

router = APIRouter(prefix="/rates", tags=["Rate Cards"])

# ----------------- MATERIALS -----------------

@router.get("/materials", response_model=List[MaterialResponse])
def list_materials(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List all material rate cards for the current company."""
    return db.query(Material).filter(
        Material.company_id == company_id,
        Material.is_active == True
    ).order_by(Material.grade.asc()).all()

@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material_in: MaterialCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new material rate card."""
    material = Material(
        company_id=company_id,
        name=material_in.name,
        grade=material_in.grade,
        density=material_in.density,
        unit=material_in.unit,
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

    for field, value in material_in.model_dump(exclude_unset=True).items():
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

# ----------------- PROCESSES -----------------

@router.get("/processes", response_model=List[ProcessResponse])
def list_processes(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List all machine & workstation process rate cards."""
    return db.query(Process).filter(
        Process.company_id == company_id,
        Process.is_active == True
    ).order_by(Process.name.asc()).all()

@router.post("/processes", response_model=ProcessResponse, status_code=status.HTTP_201_CREATED)
def create_process(
    process_in: ProcessCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new process rate card."""
    process = Process(
        company_id=company_id,
        name=process_in.name,
        unit=process_in.unit,
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

    for field, value in process_in.model_dump(exclude_unset=True).items():
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

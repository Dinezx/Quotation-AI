import re
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload, joinedload
from app.core.security import get_current_company_id
from app.db.session import get_db
from app.models.customer import Customer
from app.models.quotation import Quotation
from app.models.purchase_order import PurchaseOrder
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerCommunicationSettingsUpdate,
    CustomerPaginationResponse,
)
from app.schemas.quotation import QuotationResponse
from app.schemas.purchase_order import PurchaseOrderResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=Union[CustomerPaginationResponse, List[CustomerResponse]])
def list_customers(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    List customers for the current tenant company.
    Supports search, status filtering, and pagination.
    If page is provided, returns CustomerPaginationResponse.
    If page is omitted, returns List[CustomerResponse] (backward-compatible).
    """
    query = db.query(Customer).filter(Customer.company_id == company_id)

    # Status filter: "active", "inactive" / "deactivated", "all"
    if status_filter:
        s_val = status_filter.strip().lower()
        if s_val == "active":
            query = query.filter(Customer.is_active == True)
        elif s_val in ("inactive", "deactivated"):
            query = query.filter(Customer.is_active == False)
        elif s_val == "all":
            pass
    else:
        # Default behavior: active customers
        query = query.filter(Customer.is_active == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(term),
                Customer.email.ilike(term),
                Customer.quotation_email.ilike(term),
                Customer.gstin.ilike(term),
                Customer.contact_person.ilike(term),
                Customer.phone.ilike(term),
            )
        )

    query = query.order_by(Customer.name.asc())

    if page is not None:
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    return query.all()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Create a new customer under the current tenant with duplicate protection."""
    name = customer_in.name.strip() if customer_in.name else ""
    if not name:
        raise HTTPException(status_code=422, detail="Customer name is required.")

    quotation_email = None
    if customer_in.quotation_email and customer_in.quotation_email.strip():
        q_email = customer_in.quotation_email.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", q_email):
            raise HTTPException(status_code=422, detail="Customer quotation email is invalid.")
        quotation_email = q_email

    login_email = None
    if customer_in.email and customer_in.email.strip():
        l_email = customer_in.email.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", l_email):
            raise HTTPException(status_code=422, detail="Customer email address is invalid.")
        login_email = l_email

    gstin = None
    if customer_in.gstin and customer_in.gstin.strip():
        gstin = customer_in.gstin.strip().upper()

    # Duplicate detection within the same tenant company
    if gstin:
        existing_gstin = db.query(Customer).filter(
            Customer.company_id == company_id,
            func.upper(Customer.gstin) == gstin,
            Customer.is_active == True,
        ).first()
        if existing_gstin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A customer with GSTIN '{gstin}' already exists in your company.",
            )

    if login_email:
        existing_email = db.query(Customer).filter(
            Customer.company_id == company_id,
            func.lower(Customer.email) == login_email,
            Customer.is_active == True,
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A customer with login email '{login_email}' already exists in your company.",
            )

    customer = Customer(
        company_id=company_id,
        name=name,
        contact_person=customer_in.contact_person.strip() if customer_in.contact_person else None,
        email=login_email,
        quotation_email=quotation_email,
        phone=customer_in.phone.strip() if customer_in.phone else None,
        billing_address=customer_in.billing_address.strip() if customer_in.billing_address else None,
        shipping_address=customer_in.shipping_address.strip() if customer_in.shipping_address else None,
        gstin=gstin,
        is_active=customer_in.is_active,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Get single customer details."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Update customer details with duplicate protection."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)

    if "name" in update_data:
        val = update_data["name"]
        if val is not None:
            stripped_name = str(val).strip()
            if not stripped_name:
                raise HTTPException(status_code=422, detail="Customer name cannot be empty.")
            customer.name = stripped_name
        del update_data["name"]

    if "quotation_email" in update_data:
        val = update_data["quotation_email"]
        if val is None or not str(val).strip():
            customer.quotation_email = None
        else:
            cleaned = str(val).strip().lower()
            if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", cleaned):
                raise HTTPException(status_code=422, detail="Customer quotation email is invalid.")
            customer.quotation_email = cleaned
        del update_data["quotation_email"]

    if "email" in update_data:
        val = update_data["email"]
        if val is None or not str(val).strip():
            customer.email = None
        else:
            cleaned = str(val).strip().lower()
            if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", cleaned):
                raise HTTPException(status_code=422, detail="Customer email address is invalid.")
            # Check duplicate login email excluding self
            existing_email = db.query(Customer).filter(
                Customer.company_id == company_id,
                Customer.id != customer_id,
                func.lower(Customer.email) == cleaned,
                Customer.is_active == True,
            ).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A customer with login email '{cleaned}' already exists in your company.",
                )
            customer.email = cleaned
        del update_data["email"]

    if "gstin" in update_data:
        val = update_data["gstin"]
        if val is None or not str(val).strip():
            customer.gstin = None
        else:
            cleaned_gstin = str(val).strip().upper()
            # Check duplicate GSTIN excluding self
            existing_gstin = db.query(Customer).filter(
                Customer.company_id == company_id,
                Customer.id != customer_id,
                func.upper(Customer.gstin) == cleaned_gstin,
                Customer.is_active == True,
            ).first()
            if existing_gstin:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A customer with GSTIN '{cleaned_gstin}' already exists in your company.",
                )
            customer.gstin = cleaned_gstin
        del update_data["gstin"]

    # Handle is_active reactivation checks
    if "is_active" in update_data and update_data["is_active"] is True and not customer.is_active:
        if customer.gstin:
            conflict = db.query(Customer).filter(
                Customer.company_id == company_id,
                Customer.id != customer_id,
                func.upper(Customer.gstin) == customer.gstin.upper(),
                Customer.is_active == True,
            ).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot reactivate: active customer with GSTIN '{customer.gstin}' already exists.",
                )
        if customer.email:
            conflict = db.query(Customer).filter(
                Customer.company_id == company_id,
                Customer.id != customer_id,
                func.lower(Customer.email) == customer.email.lower(),
                Customer.is_active == True,
            ).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot reactivate: active customer with email '{customer.email}' already exists.",
                )

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}/communication-settings", response_model=CustomerResponse)
def update_customer_communication_settings(
    customer_id: str,
    settings_in: CustomerCommunicationSettingsUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Update customer quotation email communication preference without altering the login email.
    """
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if settings_in.quotation_email is None or not str(settings_in.quotation_email).strip():
        customer.quotation_email = None
    else:
        cleaned = str(settings_in.quotation_email).strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", cleaned):
            raise HTTPException(status_code=422, detail="Customer quotation email is invalid.")
        customer.quotation_email = cleaned

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Soft-delete/deactivate a customer."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.is_active = False
    db.commit()
    return None


@router.get("/{customer_id}/quotations", response_model=List[QuotationResponse])
def get_customer_quotations(
    customer_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """List all quotations for a specific customer within the tenant company."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.purchase_order),
            joinedload(Quotation.company),
        )
        .filter(
            Quotation.customer_id == customer_id,
            Quotation.company_id == company_id,
        )
        .order_by(Quotation.created_at.desc())
        .all()
    )


@router.get("/{customer_id}/purchase-orders", response_model=List[PurchaseOrderResponse])
def get_customer_purchase_orders(
    customer_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """List all purchase orders for a specific customer within the tenant company."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return (
        db.query(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.customer),
        )
        .filter(
            PurchaseOrder.customer_id == customer_id,
            PurchaseOrder.company_id == company_id,
        )
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )

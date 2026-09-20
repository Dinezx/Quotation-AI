from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import get_current_company_id
from app.db.session import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerCommunicationSettingsUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List all customers for the current tenant company."""
    return db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.is_active == True
    ).order_by(Customer.name.asc()).all()

import re

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new customer under the current tenant."""
    quotation_email = None
    if customer_in.quotation_email and customer_in.quotation_email.strip():
        q_email = customer_in.quotation_email.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", q_email):
            raise HTTPException(status_code=422, detail="Customer quotation email is invalid.")
        quotation_email = q_email

    login_email = None
    if customer_in.email and customer_in.email.strip():
        login_email = customer_in.email.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", login_email):
            raise HTTPException(status_code=422, detail="Customer email address is invalid.")

    customer = Customer(
        company_id=company_id,
        name=customer_in.name,
        contact_person=customer_in.contact_person,
        email=login_email,
        quotation_email=quotation_email,
        phone=customer_in.phone,
        billing_address=customer_in.billing_address,
        shipping_address=customer_in.shipping_address,
        gstin=customer_in.gstin,
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
    db: Session = Depends(get_db)
):
    """Get single customer details."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update customer details."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)

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
            customer.email = cleaned
        del update_data["email"]

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
    db: Session = Depends(get_db)
):
    """
    Update customer quotation email communication preference without altering the login email.
    """
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
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
    db: Session = Depends(get_db)
):
    """Soft-delete/deactivate a customer."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.is_active = False
    db.commit()
    return None

from decimal import Decimal
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.customer import Customer
from app.models.material import Material
from app.models.process import Process

def seed_initial_data(db: Session = None) -> None:
    """Insert initial reference, company, user, and rate card data if not present.

    Schema creation/DDL is strictly managed by Alembic migrations.
    This function handles ONLY data seeding.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        # Check if default company exists
        company = db.query(Company).filter(Company.id == "comp-bpe-pune").first()
        if not company:
            company = Company(
                id="comp-bpe-pune",
                name="Bharat Precision Engineering Pvt. Ltd.",
                legal_name="Bharat Precision Engineering Private Limited",
                address="Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune, Maharashtra - 411026",
                gstin="27AAACB1234F1Z8",
                phone="+91 20 2712 8840",
                email="contact@bharatprecision.co.in",
                settings={
                    "default_currency": "INR",
                    "overhead_percentage": 12.0,
                    "profit_percentage": 15.0,
                    "gst_type": "CGST_SGST",
                    "bank_name": "State Bank of India",
                    "bank_branch": "MIDC Bhosari Branch",
                    "bank_account": "38920194821",
                    "bank_ifsc": "SBIN0004128",
                    "upi_id": "bpe.pune@sbi"
                }
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        # Ensure default user
        user = db.query(User).filter(
            (User.id == "usr-bpe-001") | (User.email == "r.deshmukh@bharatprecision.co.in")
        ).first()
        if not user:
            user = User(
                id="usr-bpe-001",
                company_id="comp-bpe-pune",
                email="r.deshmukh@bharatprecision.co.in",
                full_name="Rajesh Deshmukh",
                role="COSTING_ENGINEER",
                is_active=True
            )
            db.add(user)
            db.commit()

        # Seed standard materials if empty
        # Seed standard materials (ensuring benchmark grades exist)
        standard_materials = [
            {"name": "Alloy Steel EN8", "grade": "EN8", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("85.00"), "scrap_credit_rate": Decimal("20.00")},
            {"name": "Alloy Steel EN19", "grade": "EN19", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("145.00"), "scrap_credit_rate": Decimal("45.00")},
            {"name": "Structural Steel IS 2062", "grade": "IS 2062", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("95.00"), "scrap_credit_rate": Decimal("32.00")},
            {"name": "Free Cutting Steel EN1A", "grade": "EN1A", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("110.00"), "scrap_credit_rate": Decimal("35.00")},
            {"name": "Stainless Steel 304", "grade": "SS 304", "density": Decimal("8.00"), "unit": "kg", "base_rate": Decimal("380.00"), "scrap_credit_rate": Decimal("140.00")},
            {"name": "Mild Steel IS 2062", "grade": "MS 2062", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("95.00"), "scrap_credit_rate": Decimal("32.00")},
            {"name": "Alloy Steel EN8D", "grade": "EN8D", "density": Decimal("7.85"), "unit": "kg", "base_rate": Decimal("125.00"), "scrap_credit_rate": Decimal("45.00")},
            {"name": "Grey Cast Iron Gr 25", "grade": "CI Gr.2", "density": Decimal("7.20"), "unit": "kg", "base_rate": Decimal("110.00"), "scrap_credit_rate": Decimal("38.00")},
            {"name": "Aluminium 6061-T6", "grade": "AL 6061", "density": Decimal("2.70"), "unit": "kg", "base_rate": Decimal("320.00"), "scrap_credit_rate": Decimal("110.00")},
        ]
        for mat_spec in standard_materials:
            existing = db.query(Material).filter(
                Material.company_id == "comp-bpe-pune",
                Material.grade == mat_spec["grade"]
            ).first()
            if not existing:
                db.add(Material(
                    company_id="comp-bpe-pune",
                    name=mat_spec["name"],
                    grade=mat_spec["grade"],
                    density=mat_spec["density"],
                    unit=mat_spec["unit"],
                    base_rate=mat_spec["base_rate"],
                    scrap_credit_rate=mat_spec["scrap_credit_rate"],
                    is_active=True
                ))
        db.commit()

        # Seed standard processes (ensuring benchmark processes exist)
        standard_processes = [
            {"name": "CNC Machining", "unit": "hour", "hourly_rate": Decimal("650.00"), "setup_cost": Decimal("100.00")},
            {"name": "Turning", "unit": "hour", "hourly_rate": Decimal("500.00"), "setup_cost": Decimal("75.00")},
            {"name": "CNC 4-Axis Milling (VMC-850)", "unit": "hour", "hourly_rate": Decimal("1200.00"), "setup_cost": Decimal("500.00")},
            {"name": "CNC Turning Center (Doosan Puma)", "unit": "hour", "hourly_rate": Decimal("850.00"), "setup_cost": Decimal("400.00")},
            {"name": "CNC High-Precision Turning", "unit": "hour", "hourly_rate": Decimal("385.00"), "setup_cost": Decimal("500.00")},
            {"name": "Surface Grinding (Kent Precision)", "unit": "hour", "hourly_rate": Decimal("450.00"), "setup_cost": Decimal("250.00")},
            {"name": "Fiber Laser Cutting 4kW", "unit": "hour", "hourly_rate": Decimal("1800.00"), "setup_cost": Decimal("600.00")},
        ]
        for proc_spec in standard_processes:
            existing = db.query(Process).filter(
                Process.company_id == "comp-bpe-pune",
                Process.name == proc_spec["name"]
            ).first()
            if not existing:
                db.add(Process(
                    company_id="comp-bpe-pune",
                    name=proc_spec["name"],
                    unit=proc_spec["unit"],
                    hourly_rate=proc_spec["hourly_rate"],
                    setup_cost=proc_spec["setup_cost"],
                    is_active=True
                ))
        db.commit()

        # Seed customer Mahindra & Mahindra if empty
        if db.query(Customer).filter(Customer.company_id == "comp-bpe-pune").count() == 0:
            customer = Customer(
                id="cust-mm-01",
                company_id="comp-bpe-pune",
                name="Mahindra & Mahindra Ltd.",
                contact_person="Vikram Malhotra (Lead Sourcing Manager)",
                email="procurement@mahindra.com",
                phone="+91 22 2490 1441",
                billing_address="Automotive Division, Gateway Building, Apollo Bunder, Mumbai, MH - 400001",
                shipping_address="Chakan Plant II, Plot F-1, MIDC Chakan Phase II, Pune - 410501",
                gstin="27AAACM0012P1ZX",
                is_active=True
            )
            db.add(customer)
            db.commit()

    finally:
        if should_close:
            db.close()


def init_db(db: Session = None) -> None:
    """Backward compatibility alias for seed_initial_data."""
    seed_initial_data(db=db)


if __name__ == "__main__":
    seed_initial_data()


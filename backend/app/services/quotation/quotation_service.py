from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.quotation import Quotation

class QuotationService:
    @staticmethod
    def generate_quotation_number(db: Session, company_id: str) -> str:
        """
        Generates the next sequential quotation number:
        Format: QT-YYYY-XXXX (e.g. QT-2026-0001)
        """
        year = datetime.utcnow().strftime("%Y")
        prefix = f"QT-{year}-"
        
        # Count existing quotations for this year and company
        count = db.query(func.count(Quotation.id)).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_number.like(f"{prefix}%")
        ).scalar() or 0

        next_sequence = count + 1
        return f"{prefix}{next_sequence:04d}"

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_company_id
from app.db.session import get_db
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: str = Query("this_month", description="Period filter: today, this_week, this_month, last_month, this_quarter, this_year, custom"),
    start_date: Optional[date] = Query(None, description="Custom start date (YYYY-MM-DD) when period=custom"),
    end_date: Optional[date] = Query(None, description="Custom end date (YYYY-MM-DD) when period=custom"),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Consolidated executive dashboard summary.
    Computes key performance indicators, quotation activity trends, status breakdowns,
    quotation value trends, pending actions, recent quotations, recent activity timeline,
    customer activity telemetry, and email summary.

    NOTE: Quotation value reflects operational pipeline amounts, NOT realized accounting revenue.
    Strict tenant isolation is enforced: data is strictly scoped to the authenticated user's company_id.
    """
    return dashboard_service.get_dashboard_summary(
        db=db,
        company_id=company_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

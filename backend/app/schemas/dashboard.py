from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class DashboardKPIs(BaseModel):
    """
    Key operational performance indicators computed via database aggregations.
    Quotation value represents total quoted amounts, NOT accounting revenue.
    """
    quotations_created: int = 0
    pending_po_review: int = 0
    draft_quotations: int = 0
    finalized_quotations: int = 0
    total_quotation_value: Decimal = Decimal("0.00")
    quotation_value: Decimal = Decimal("0.00")
    finalized_quotation_value: Decimal = Decimal("0.00")


class ActivityTrendPoint(BaseModel):
    """Quotation count and values over time (grouped by date)."""
    date: str  # YYYY-MM-DD
    count: int = 0
    quotation_value: Decimal = Decimal("0.00")
    finalized_value: Decimal = Decimal("0.00")


class StatusBreakdownItem(BaseModel):
    """Quotation count and total value grouped by actual quotation status."""
    status: str
    count: int = 0
    value: Decimal = Decimal("0.00")
    percentage: float = 0.0


class ValueTrendPoint(BaseModel):
    """Quotation value and finalized quotation value trend over time."""
    date: str  # YYYY-MM-DD
    quotation_value: Decimal = Decimal("0.00")
    finalized_value: Decimal = Decimal("0.00")


class PendingActionItem(BaseModel):
    """Actionable item requiring user attention with direct navigation link."""
    id: str
    type: str  # "po_review" | "draft_quotation" | "email_failed"
    reference_number: str
    customer_name: Optional[str] = None
    description: str
    created_at: datetime
    link: str


class RecentQuotationItem(BaseModel):
    """Recent quotation record for high-density overview."""
    id: str
    quotation_number: str
    customer: Optional[str] = None
    customer_name: Optional[str] = None
    date: datetime
    quotation_date: datetime
    amount: Decimal = Decimal("0.00")
    final_total: Decimal = Decimal("0.00")
    status: str
    email_status: str


class RecentActivityEvent(BaseModel):
    """Factual operational event derived from actual database records."""
    id: str
    type: str  # "PO_UPLOADED" | "PO_APPROVED" | "QUOTATION_CREATED" | "QUOTATION_FINALIZED" | "QUOTATION_EMAILED" | "CUSTOMER_CREATED"
    title: str
    description: str
    timestamp: datetime
    reference_id: str
    link: Optional[str] = None


class CustomerActivityItem(BaseModel):
    """Quotation volume and value aggregated per customer in period."""
    id: str
    name: str
    quotation_count: int = 0
    total_value: Decimal = Decimal("0.00")


class RecentCustomerItem(BaseModel):
    """Recently onboarded customer account."""
    id: str
    name: str
    created_at: datetime


class CustomerActivitySummary(BaseModel):
    """Factual customer metrics without subjective labels."""
    total_active_customers: int = 0
    customers_with_quotations: int = 0
    top_customers: List[CustomerActivityItem] = Field(default_factory=list)
    recent_customers: List[RecentCustomerItem] = Field(default_factory=list)


class EmailSummary(BaseModel):
    """Email dispatch telemetry based on Resend tracking."""
    sent: int = 0
    failed: int = 0
    pending: int = 0
    not_sent: int = 0
    total: int = 0
    success_rate: float = 0.0


class DashboardSummaryResponse(BaseModel):
    """Consolidated dashboard summary returned by GET /api/v1/dashboard/summary."""
    period: str = "this_month"
    start_date: str
    end_date: str
    kpis: DashboardKPIs = Field(default_factory=DashboardKPIs)
    quotation_activity: List[ActivityTrendPoint] = Field(default_factory=list)
    status_breakdown: List[StatusBreakdownItem] = Field(default_factory=list)
    value_trend: List[ValueTrendPoint] = Field(default_factory=list)
    pending_actions: List[PendingActionItem] = Field(default_factory=list)
    recent_quotations: List[RecentQuotationItem] = Field(default_factory=list)
    recent_activity: List[RecentActivityEvent] = Field(default_factory=list)
    customer_activity: CustomerActivitySummary = Field(default_factory=CustomerActivitySummary)
    email_summary: EmailSummary = Field(default_factory=EmailSummary)

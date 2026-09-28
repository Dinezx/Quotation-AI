from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case

from app.models.quotation import Quotation
from app.models.purchase_order import PurchaseOrder
from app.models.customer import Customer
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardKPIs,
    ActivityTrendPoint,
    StatusBreakdownItem,
    ValueTrendPoint,
    PendingActionItem,
    RecentQuotationItem,
    RecentActivityEvent,
    CustomerActivitySummary,
    CustomerActivityItem,
    RecentCustomerItem,
    EmailSummary,
)

SUPPORTED_PERIODS = {
    "today",
    "this_week",
    "this_month",
    "last_month",
    "this_quarter",
    "this_year",
    "custom",
}


class DashboardService:
    """
    High-performance business analytics and operational telemetry service.
    Quotation values represent operational pipeline volume, NOT accounting revenue.
    All aggregations execute strictly within the tenant's database boundary (company_id).
    """

    @staticmethod
    def resolve_date_range(
        period: str,
        start_date_param: Optional[date] = None,
        end_date_param: Optional[date] = None,
    ) -> Tuple[datetime, datetime, str]:
        """
        Determines the [start_datetime, end_datetime] range based on standard period filters.
        Ensures consistent UTC start-of-day (00:00:00) and inclusive end-of-day (23:59:59.999999).
        Raises HTTP 422 on invalid custom range or unsupported period.
        """
        if period not in SUPPORTED_PERIODS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported period '{period}'. Supported periods are: {', '.join(sorted(SUPPORTED_PERIODS))}",
            )

        now = datetime.utcnow()
        today = now.date()

        if period == "today":
            start_d = today
            end_d = today
        elif period == "this_week":
            start_d = today - timedelta(days=today.weekday())
            end_d = today
        elif period == "this_month":
            start_d = today.replace(day=1)
            end_d = today
        elif period == "last_month":
            first_of_this_month = today.replace(day=1)
            last_day_prev_month = first_of_this_month - timedelta(days=1)
            start_d = last_day_prev_month.replace(day=1)
            end_d = last_day_prev_month
        elif period == "this_quarter":
            quarter_month = 1 + 3 * ((today.month - 1) // 3)
            start_d = today.replace(month=quarter_month, day=1)
            end_d = today
        elif period == "this_year":
            start_d = today.replace(month=1, day=1)
            end_d = today
        elif period == "custom":
            if not start_date_param or not end_date_param:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="start_date and end_date query parameters are required when period='custom'",
                )
            if start_date_param > end_date_param:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="start_date cannot be after end_date",
                )
            start_d = start_date_param
            end_d = end_date_param
        else:
            period = "this_month"
            start_d = today.replace(day=1)
            end_d = today

        # End date is strictly INCLUSIVE (up to 23:59:59.999999 of the end date)
        start_dt = datetime.combine(start_d, datetime.min.time())
        end_dt = datetime.combine(end_d, datetime.max.time())
        return start_dt, end_dt, period

    def get_dashboard_summary(
        self,
        db: Session,
        company_id: str,
        period: str = "this_month",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardSummaryResponse:
        """
        Consolidates complete dashboard operational summary via fast database aggregations.
        Guarantees strict tenant isolation by scoping all queries to company_id.
        """
        start_dt, end_dt, canonical_period = self.resolve_date_range(period, start_date, end_date)

        # 1. Quotation KPI Aggregations (Single SQL query with conditional aggregations)
        q_kpi_row = db.query(
            func.count(Quotation.id).label("total_quotes"),
            func.coalesce(func.sum(Quotation.final_total), 0).label("total_value"),
            func.count(case((Quotation.status == "DRAFT", Quotation.id))).label("draft_quotes"),
            func.count(case((Quotation.status == "FINALIZED", Quotation.id))).label("finalized_quotes"),
            func.coalesce(func.sum(case((Quotation.status == "FINALIZED", Quotation.final_total), else_=0)), 0).label("finalized_value"),
        ).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_date >= start_dt,
            Quotation.quotation_date <= end_dt,
        ).first()

        total_quotes = int(q_kpi_row.total_quotes) if q_kpi_row and q_kpi_row.total_quotes else 0
        total_val = Decimal(str(q_kpi_row.total_value)) if q_kpi_row and q_kpi_row.total_value else Decimal("0.00")
        draft_quotes = int(q_kpi_row.draft_quotes) if q_kpi_row and q_kpi_row.draft_quotes else 0
        fin_quotes = int(q_kpi_row.finalized_quotes) if q_kpi_row and q_kpi_row.finalized_quotes else 0
        fin_val = Decimal(str(q_kpi_row.finalized_value)) if q_kpi_row and q_kpi_row.finalized_value else Decimal("0.00")

        # Pending PO Review workload (backlog of unapproved customer purchase orders)
        pending_po_count = db.query(func.count(PurchaseOrder.id)).filter(
            PurchaseOrder.company_id == company_id,
            PurchaseOrder.status == "NEEDS_REVIEW",
        ).scalar() or 0

        kpis = DashboardKPIs(
            quotations_created=total_quotes,
            pending_po_review=pending_po_count,
            draft_quotations=draft_quotes,
            finalized_quotations=fin_quotes,
            total_quotation_value=total_val,
            quotation_value=total_val,
            finalized_quotation_value=fin_val,
        )

        # 2. Quotation Activity & Value Trend (Grouped by date)
        trend_rows = db.query(
            func.date(Quotation.quotation_date).label("q_date"),
            func.count(Quotation.id).label("activity_count"),
            func.coalesce(func.sum(Quotation.final_total), 0).label("total_val"),
            func.coalesce(func.sum(case((Quotation.status == "FINALIZED", Quotation.final_total), else_=0)), 0).label("fin_val"),
        ).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_date >= start_dt,
            Quotation.quotation_date <= end_dt,
        ).group_by(
            func.date(Quotation.quotation_date)
        ).order_by(
            func.date(Quotation.quotation_date).asc()
        ).all()

        quotation_activity: List[ActivityTrendPoint] = []
        value_trend: List[ValueTrendPoint] = []
        for r in trend_rows:
            date_str = str(r.q_date)
            q_val = Decimal(str(r.total_val))
            fin_v = Decimal(str(r.fin_val))
            quotation_activity.append(
                ActivityTrendPoint(
                    date=date_str,
                    count=int(r.activity_count),
                    quotation_value=q_val,
                    finalized_value=fin_v,
                )
            )
            value_trend.append(
                ValueTrendPoint(
                    date=date_str,
                    quotation_value=q_val,
                    finalized_value=fin_v,
                )
            )

        # 3. Status Breakdown
        status_rows = db.query(
            Quotation.status,
            func.count(Quotation.id).label("status_count"),
            func.coalesce(func.sum(Quotation.final_total), 0).label("value"),
        ).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_date >= start_dt,
            Quotation.quotation_date <= end_dt,
        ).group_by(
            Quotation.status
        ).order_by(
            func.count(Quotation.id).desc()
        ).all()

        status_breakdown: List[StatusBreakdownItem] = []
        for s in status_rows:
            cnt = int(s.status_count)
            val = Decimal(str(s.value))
            pct = round((cnt / total_quotes * 100), 1) if total_quotes > 0 else 0.0
            status_breakdown.append(
                StatusBreakdownItem(
                    status=s.status,
                    count=cnt,
                    value=val,
                    percentage=pct,
                )
            )

        # 4. Pending Actions
        pending_actions: List[PendingActionItem] = []

        # 4a. POs requiring review
        needs_review_pos = db.query(
            PurchaseOrder.id,
            PurchaseOrder.po_number,
            PurchaseOrder.customer_name,
            PurchaseOrder.created_at,
        ).filter(
            PurchaseOrder.company_id == company_id,
            PurchaseOrder.status == "NEEDS_REVIEW",
        ).order_by(PurchaseOrder.created_at.desc()).limit(5).all()

        for po in needs_review_pos:
            pending_actions.append(
                PendingActionItem(
                    id=po.id,
                    type="po_review",
                    reference_number=po.po_number,
                    customer_name=po.customer_name,
                    description=f"Purchase order {po.po_number} requires engineer review and pricing confirmation",
                    created_at=po.created_at,
                    link=f"/review/{po.id}",
                )
            )

        # 4b. Draft quotations
        draft_quotes_list = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Customer.name.label("customer_name"),
            Quotation.created_at,
        ).outerjoin(
            Customer, Quotation.customer_id == Customer.id
        ).filter(
            Quotation.company_id == company_id,
            Quotation.status == "DRAFT",
        ).order_by(Quotation.created_at.desc()).limit(5).all()

        for q in draft_quotes_list:
            pending_actions.append(
                PendingActionItem(
                    id=q.id,
                    type="draft_quotation",
                    reference_number=q.quotation_number,
                    customer_name=q.customer_name,
                    description=f"Quotation {q.quotation_number} is in draft state; review costing and finalize",
                    created_at=q.created_at,
                    link=f"/quotation/{q.id}",
                )
            )

        # 4c. Failed quotation emails
        failed_emails = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Customer.name.label("customer_name"),
            Quotation.email_error,
            Quotation.email_sent_at,
            Quotation.created_at,
        ).outerjoin(
            Customer, Quotation.customer_id == Customer.id
        ).filter(
            Quotation.company_id == company_id,
            Quotation.email_status == "FAILED",
        ).order_by(Quotation.created_at.desc()).limit(5).all()

        for q in failed_emails:
            err_snip = f": {q.email_error[:60]}" if q.email_error else ""
            pending_actions.append(
                PendingActionItem(
                    id=q.id,
                    type="email_failed",
                    reference_number=q.quotation_number,
                    customer_name=q.customer_name,
                    description=f"Email dispatch failed for {q.quotation_number}{err_snip}",
                    created_at=q.email_sent_at or q.created_at,
                    link=f"/quotation/{q.id}",
                )
            )

        pending_actions.sort(key=lambda x: x.created_at, reverse=True)
        pending_actions = pending_actions[:10]

        # 5. Recent Quotations (5-10 recent records) - project specific columns
        recent_quotes = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Customer.name.label("customer_name"),
            Quotation.quotation_date,
            Quotation.final_total,
            Quotation.status,
            Quotation.email_status,
            Quotation.created_at,
        ).outerjoin(
            Customer, Quotation.customer_id == Customer.id
        ).filter(
            Quotation.company_id == company_id,
        ).order_by(
            Quotation.created_at.desc()
        ).limit(10).all()

        recent_quotations: List[RecentQuotationItem] = []
        for rq in recent_quotes:
            c_name = rq.customer_name
            tot = rq.final_total or Decimal("0.00")
            recent_quotations.append(
                RecentQuotationItem(
                    id=rq.id,
                    quotation_number=rq.quotation_number,
                    customer=c_name,
                    customer_name=c_name,
                    date=rq.quotation_date,
                    quotation_date=rq.quotation_date,
                    amount=tot,
                    final_total=tot,
                    status=rq.status,
                    email_status=rq.email_status,
                )
            )

        # 6. Recent Activity (Factual operational events from database records)
        activity_events: List[RecentActivityEvent] = []

        recent_pos = db.query(
            PurchaseOrder.id,
            PurchaseOrder.po_number,
            PurchaseOrder.customer_name,
            PurchaseOrder.created_at,
        ).filter(
            PurchaseOrder.company_id == company_id
        ).order_by(PurchaseOrder.created_at.desc()).limit(5).all()

        for po in recent_pos:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-po-up-{po.id}",
                    type="PO_UPLOADED",
                    title=f"PO Uploaded ({po.po_number})",
                    description=f"Purchase order {po.po_number} received from {po.customer_name or 'customer'}",
                    timestamp=po.created_at,
                    reference_id=po.id,
                    link=f"/review/{po.id}",
                )
            )

        recent_approved_pos = db.query(
            PurchaseOrder.id,
            PurchaseOrder.po_number,
            PurchaseOrder.approved_at,
        ).filter(
            PurchaseOrder.company_id == company_id,
            PurchaseOrder.approved_at.isnot(None),
        ).order_by(PurchaseOrder.approved_at.desc()).limit(5).all()

        for po in recent_approved_pos:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-po-app-{po.id}",
                    type="PO_APPROVED",
                    title=f"PO Approved ({po.po_number})",
                    description=f"Purchase order {po.po_number} approved for quote calculation",
                    timestamp=po.approved_at,
                    reference_id=po.id,
                    link=f"/review/{po.id}",
                )
            )

        recent_created_quotes = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Quotation.final_total,
            Quotation.created_at,
        ).filter(
            Quotation.company_id == company_id
        ).order_by(Quotation.created_at.desc()).limit(5).all()

        for q in recent_created_quotes:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-qt-cr-{q.id}",
                    type="QUOTATION_CREATED",
                    title=f"Quotation Created ({q.quotation_number})",
                    description=f"Quotation calculated with total value of ₹{q.final_total:,.2f}",
                    timestamp=q.created_at,
                    reference_id=q.id,
                    link=f"/quotation/{q.id}",
                )
            )

        recent_finalized_quotes = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Quotation.finalized_by,
            Quotation.finalized_at,
        ).filter(
            Quotation.company_id == company_id,
            Quotation.finalized_at.isnot(None),
        ).order_by(Quotation.finalized_at.desc()).limit(5).all()

        for q in recent_finalized_quotes:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-qt-fin-{q.id}",
                    type="QUOTATION_FINALIZED",
                    title=f"Quotation Finalized ({q.quotation_number})",
                    description=f"Quotation sealed with PDF SHA-256 by {q.finalized_by or 'engineering'}",
                    timestamp=q.finalized_at,
                    reference_id=q.id,
                    link=f"/quotation/{q.id}",
                )
            )

        recent_emailed_quotes = db.query(
            Quotation.id,
            Quotation.quotation_number,
            Quotation.email_recipient,
            Quotation.email_sent_at,
        ).filter(
            Quotation.company_id == company_id,
            Quotation.email_sent_at.isnot(None),
        ).order_by(Quotation.email_sent_at.desc()).limit(5).all()

        for q in recent_emailed_quotes:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-qt-em-{q.id}",
                    type="QUOTATION_EMAILED",
                    title=f"Quotation Emailed ({q.quotation_number})",
                    description=f"Quotation dispatched to {q.email_recipient or 'customer'}",
                    timestamp=q.email_sent_at,
                    reference_id=q.id,
                    link=f"/quotation/{q.id}",
                )
            )

        recent_custs = db.query(
            Customer.id,
            Customer.name,
            Customer.gstin,
            Customer.created_at,
        ).filter(
            Customer.company_id == company_id
        ).order_by(Customer.created_at.desc()).limit(5).all()

        for c in recent_custs:
            activity_events.append(
                RecentActivityEvent(
                    id=f"act-cust-cr-{c.id}",
                    type="CUSTOMER_CREATED",
                    title=f"Customer Added ({c.name})",
                    description=f"Customer profile registered with GSTIN {c.gstin or 'N/A'}",
                    timestamp=c.created_at,
                    reference_id=c.id,
                    link=f"/customers/{c.id}",
                )
            )

        activity_events.sort(key=lambda x: x.timestamp, reverse=True)
        activity_events = activity_events[:10]

        # 7. Customer Activity
        total_active_customers = db.query(func.count(Customer.id)).filter(
            Customer.company_id == company_id,
            Customer.is_active.is_(True),
        ).scalar() or 0

        customers_with_quotes = db.query(
            func.count(func.distinct(Quotation.customer_id))
        ).filter(
            Quotation.company_id == company_id,
            Quotation.customer_id.isnot(None),
        ).scalar() or 0

        top_cust_rows = db.query(
            Customer.id,
            Customer.name,
            func.count(Quotation.id).label("quote_count"),
            func.coalesce(func.sum(Quotation.final_total), 0).label("total_value"),
        ).join(
            Quotation, Quotation.customer_id == Customer.id
        ).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_date >= start_dt,
            Quotation.quotation_date <= end_dt,
        ).group_by(
            Customer.id, Customer.name
        ).order_by(
            func.count(Quotation.id).desc(),
            func.sum(Quotation.final_total).desc(),
        ).limit(5).all()

        top_customers: List[CustomerActivityItem] = [
            CustomerActivityItem(
                id=tc.id,
                name=tc.name,
                quotation_count=int(tc.quote_count),
                total_value=Decimal(str(tc.total_value)),
            )
            for tc in top_cust_rows
        ]

        recent_cust_models = db.query(
            Customer.id,
            Customer.name,
            Customer.created_at,
        ).filter(
            Customer.company_id == company_id
        ).order_by(Customer.created_at.desc()).limit(5).all()

        recent_customers: List[RecentCustomerItem] = [
            RecentCustomerItem(id=rc.id, name=rc.name, created_at=rc.created_at)
            for rc in recent_cust_models
        ]

        customer_activity = CustomerActivitySummary(
            total_active_customers=total_active_customers,
            customers_with_quotations=customers_with_quotes,
            top_customers=top_customers,
            recent_customers=recent_customers,
        )

        # 8. Email Summary
        email_stat_rows = db.query(
            Quotation.email_status,
            func.count(Quotation.id).label("email_count"),
        ).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_date >= start_dt,
            Quotation.quotation_date <= end_dt,
        ).group_by(
            Quotation.email_status
        ).all()

        sent_count = 0
        failed_count = 0
        not_sent_count = 0
        for es in email_stat_rows:
            if es.email_status == "SENT":
                sent_count += int(es.email_count)
            elif es.email_status == "FAILED":
                failed_count += int(es.email_count)
            else:
                not_sent_count += int(es.email_count)

        total_email_records = sent_count + failed_count + not_sent_count
        attempted = sent_count + failed_count
        success_rate = round((sent_count / attempted * 100), 1) if attempted > 0 else 0.0

        email_summary = EmailSummary(
            sent=sent_count,
            failed=failed_count,
            pending=not_sent_count,
            not_sent=not_sent_count,
            total=total_email_records,
            success_rate=success_rate,
        )

        return DashboardSummaryResponse(
            period=canonical_period,
            start_date=start_dt.date().isoformat(),
            end_date=end_dt.date().isoformat(),
            kpis=kpis,
            quotation_activity=quotation_activity,
            status_breakdown=status_breakdown,
            value_trend=value_trend,
            pending_actions=pending_actions,
            recent_quotations=recent_quotations,
            recent_activity=activity_events,
            customer_activity=customer_activity,
            email_summary=email_summary,
        )


dashboard_service = DashboardService()

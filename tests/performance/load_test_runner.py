"""
QUOTATION AI — LOAD TESTING RUNNER & CONCURRENCY BENCHMARK
Tests A, B, C, D, E across varying concurrency levels (10, 25, 50).
Uses httpx.AsyncClient with ASGITransport to profile actual ASGI endpoints,
SQLAlchemy queries, rate matching, deterministic calculations, and PDF generation.
"""

import os
import sys
import time
import math
import asyncio
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Any, Callable

# Ensure backend root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from jose import jwt, jwk
from jose.utils import base64url_encode
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import httpx

from app.main import app
from app.core.config import settings
from app.core.jwks import jwks_manager
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import seed_initial_data
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.material import Material
from app.models.process import Process
from app.models.quotation import Quotation
from app.services.pricing.pricing_service import PricingService
from app.schemas.pricing import POCalculateRequest

KID_PERF = "perf-test-kid-2026"


def setup_auth_token() -> str:
    """Generate and register ES256 key pair with jwks_manager for authentication."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    numbers = public_key.public_numbers()
    x_bytes = numbers.x.to_bytes(32, byteorder="big")
    y_bytes = numbers.y.to_bytes(32, byteorder="big")

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "x": base64url_encode(x_bytes).decode("ascii"),
        "y": base64url_encode(y_bytes).decode("ascii"),
        "alg": "ES256",
        "use": "sig",
        "kid": KID_PERF,
    }
    constructed_pub = jwk.construct(jwk_dict, algorithm="ES256")
    jwks_manager.register_test_key(KID_PERF, constructed_pub)

    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    now = int(time.time())
    claims = {
        "sub": "usr-bpe-001",
        "iss": settings.SUPABASE_JWT_ISSUER,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": now + 86400,
        "iat": now,
        "role": "authenticated",
        "email": "r.deshmukh@bharatprecision.co.in",
    }
    return jwt.encode(claims, pem_priv, algorithm="ES256", headers={"kid": KID_PERF})


def setup_benchmark_data() -> Dict[str, Any]:
    """Ensure schema, initial seeds, and benchmark-specific PO/Quotation exist."""
    Base.metadata.create_all(bind=engine)
    seed_initial_data()

    db = SessionLocal()
    try:
        company_id = "comp-bpe-pune"

        # Ensure benchmark customer exists
        cust = db.query(Customer).filter(
            Customer.company_id == company_id,
            Customer.name == "Benchmark Precision Works Pvt. Ltd."
        ).first()
        if not cust:
            cust = Customer(
                company_id=company_id,
                name="Benchmark Precision Works Pvt. Ltd.",
                email="procurement@benchmarkprecision.in",
                phone="+91 20 2710 9999",
                billing_address="Plot B-12, Bhosari MIDC, Pune 411026",
                gstin="27AABCB9999F1Z5",
                is_active=True,
            )
            db.add(cust)
            db.commit()
            db.refresh(cust)

        # Ensure benchmark PO exists and is up to date
        old_po = db.query(PurchaseOrder).filter(
            PurchaseOrder.company_id == company_id,
            PurchaseOrder.po_number == "PO-PERF-BENCHMARK-001"
        ).first()
        if old_po:
            # Delete any old quotation drafts referencing this PO
            db.query(Quotation).filter(Quotation.purchase_order_id == old_po.id).delete(synchronize_session=False)
            db.delete(old_po)
            db.commit()

        po = PurchaseOrder(
            company_id=company_id,
            customer_id=cust.id,
            customer_name=cust.name,
            po_number="PO-PERF-BENCHMARK-001",
            po_date=datetime(2026, 9, 21, 10, 0, 0),
            status="APPROVED",
            delivery_terms="Ex-Works Pune",
            payment_terms="30 Days net",
        )
        db.add(po)
        db.flush()

        # Add 2 benchmark items with realistic machining specs
        item1 = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_number=1,
            part_name="Precision Spindle Shaft",
            material_grade="EN1A",
            process_name="CNC Machining",
            quantity=Decimal("50.00"),
            unit="PCS",
            gross_weight_kg=Decimal("4.500"),
            scrap_weight_kg=Decimal("0.500"),
            machining_hours=Decimal("1.25"),
            setup_hours=Decimal("0.50"),
            confidence=Decimal("1.00"),
        )
        item2 = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_number=2,
            part_name="Flange Adapter Plate",
            material_grade="SS 304",
            process_name="Turning",
            quantity=Decimal("25.00"),
            unit="PCS",
            gross_weight_kg=Decimal("2.200"),
            scrap_weight_kg=Decimal("0.300"),
            machining_hours=Decimal("0.75"),
            setup_hours=Decimal("0.25"),
            confidence=Decimal("1.00"),
        )
        db.add(item1)
        db.add(item2)
        db.commit()
        db.refresh(po)

        # Ensure at least one benchmark quotation exists for PDF testing
        quote = db.query(Quotation).filter(
            Quotation.company_id == company_id,
            Quotation.purchase_order_id == po.id
        ).first()
        if not quote:
            calc_res = PricingService.calculate_purchase_order(
                po=po,
                db=db,
                company_id=company_id,
                calc_params=POCalculateRequest(
                    persist_draft=True,
                    profit_margin=15.0,
                    overhead_percentage=12.0,
                    gst_type="CGST_SGST",
                ),
            )
            quote = db.query(Quotation).filter(Quotation.id == calc_res.quotation_id).first()

        return {
            "company_id": company_id,
            "customer_id": cust.id,
            "customer_name": cust.name,
            "po_id": po.id,
            "quotation_id": quote.id,
        }
    finally:
        db.close()


class PerformanceStats:
    """Calculates latency distribution percentiles and throughput."""

    def __init__(self, latencies_ms: List[float], errors: int, timeouts: int, total_wall_time_s: float):
        self.count = len(latencies_ms)
        self.errors = errors
        self.timeouts = timeouts
        self.total_wall_time_s = total_wall_time_s
        self.latencies_ms = sorted(latencies_ms) if latencies_ms else []

    @property
    def rps(self) -> float:
        if self.total_wall_time_s > 0:
            return round(self.count / self.total_wall_time_s, 2)
        return 0.0

    @property
    def avg_ms(self) -> float:
        if self.count > 0:
            return round(sum(self.latencies_ms) / self.count, 2)
        return 0.0

    @property
    def min_ms(self) -> float:
        return round(self.latencies_ms[0], 2) if self.latencies_ms else 0.0

    @property
    def max_ms(self) -> float:
        return round(self.latencies_ms[-1], 2) if self.latencies_ms else 0.0

    def percentile(self, p: float) -> float:
        if not self.latencies_ms:
            return 0.0
        k = (len(self.latencies_ms) - 1) * (p / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return round(self.latencies_ms[int(k)], 2)
        d0 = self.latencies_ms[int(f)] * (c - k)
        d1 = self.latencies_ms[int(c)] * (k - f)
        return round(d0 + d1, 2)

    @property
    def p50_ms(self) -> float:
        return self.percentile(50)

    @property
    def p95_ms(self) -> float:
        return self.percentile(95)

    @property
    def p99_ms(self) -> float:
        return self.percentile(99)

    @property
    def error_pct(self) -> float:
        total = self.count + self.errors
        if total > 0:
            return round((self.errors / total) * 100.0, 2)
        return 0.0


async def run_concurrency_batch(
    client: httpx.AsyncClient,
    request_factories: List[Callable[[], Any]],
) -> PerformanceStats:
    """Executes a batch of requests concurrently using asyncio.gather."""
    latencies = []
    errors = 0
    timeouts = 0

    async def _worker(req_fn):
        nonlocal errors, timeouts
        t0 = time.perf_counter()
        try:
            resp = await req_fn()
            t_elapsed = (time.perf_counter() - t0) * 1000.0
            if resp.status_code >= 400:
                errors += 1
                print(f"[CONCURRENCY ERROR] Status {resp.status_code}: {resp.text[:120]}")
            else:
                latencies.append(t_elapsed)
        except httpx.TimeoutException:
            timeouts += 1
            errors += 1
            print("[CONCURRENCY TIMEOUT] Request timed out after timeout window")
        except Exception as e:
            errors += 1
            print(f"[CONCURRENCY EXCEPTION] {type(e).__name__}: {str(e)[:120]}")

    t_wall_start = time.perf_counter()
    await asyncio.gather(*[_worker(fn) for fn in request_factories])
    t_wall_total = time.perf_counter() - t_wall_start

    return PerformanceStats(latencies, errors, timeouts, t_wall_total)


async def execute_benchmarks() -> Dict[str, Dict[int, PerformanceStats]]:
    """Runs tests A, B, C, D, E with concurrency levels 10, 25, 50."""
    token = setup_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    data = setup_benchmark_data()

    transport = httpx.ASGITransport(app=app)
    results: Dict[str, Dict[int, PerformanceStats]] = {}

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=15.0) as client:
        # TEST A: Customer Search
        results["TEST_A"] = {}
        for concurrency in [10, 25, 50]:
            print(f"[*] Running TEST A (Customer Search) with concurrency {concurrency}...", flush=True)
            reqs = [
                lambda: client.get("/api/v1/customers?search=Benchmark", headers=headers)
                for _ in range(concurrency)
            ]
            stats = await run_concurrency_batch(client, reqs)
            results["TEST_A"][concurrency] = stats
            print(f"    -> Done in {stats.total_wall_time_s:.2f}s | RPS: {stats.rps} | Avg: {stats.avg_ms}ms | Errors: {stats.errors}", flush=True)

        # TEST B: Quotation History
        results["TEST_B"] = {}
        for concurrency in [10, 25, 50]:
            print(f"[*] Running TEST B (Quotation History) with concurrency {concurrency}...", flush=True)
            reqs = [
                lambda: client.get("/api/v1/quotations?page=1&page_size=10", headers=headers)
                for _ in range(concurrency)
            ]
            stats = await run_concurrency_batch(client, reqs)
            results["TEST_B"][concurrency] = stats
            print(f"    -> Done in {stats.total_wall_time_s:.2f}s | RPS: {stats.rps} | Avg: {stats.avg_ms}ms | Errors: {stats.errors}", flush=True)

        # TEST C: Quotation Calculation (pure deterministic math + rate matching)
        results["TEST_C"] = {}
        for concurrency in [10, 25, 50]:
            print(f"[*] Running TEST C (Quotation Calculation) with concurrency {concurrency}...", flush=True)
            reqs = [
                lambda: client.post(
                    f"/api/v1/purchase-orders/{data['po_id']}/calculate",
                    json={"persist_draft": False, "profit_margin": 15.0, "overhead_percentage": 12.0},
                    headers=headers
                )
                for _ in range(concurrency)
            ]
            stats = await run_concurrency_batch(client, reqs)
            results["TEST_C"][concurrency] = stats
            print(f"    -> Done in {stats.total_wall_time_s:.2f}s | RPS: {stats.rps} | Avg: {stats.avg_ms}ms | Errors: {stats.errors}", flush=True)

        # TEST D: PDF Retrieval
        results["TEST_D"] = {}
        for concurrency in [5, 10]:
            print(f"[*] Running TEST D (PDF Retrieval) with concurrency {concurrency}...", flush=True)
            reqs = [
                lambda: client.get(f"/api/v1/quotations/{data['quotation_id']}/pdf", headers=headers)
                for _ in range(concurrency)
            ]
            stats = await run_concurrency_batch(client, reqs)
            results["TEST_D"][concurrency] = stats
            print(f"    -> Done in {stats.total_wall_time_s:.2f}s | RPS: {stats.rps} | Avg: {stats.avg_ms}ms | Errors: {stats.errors}", flush=True)

        # TEST E: Mixed Workload (search, history, PO retrieval, calculation, PDF retrieval)
        results["TEST_E"] = {}
        for concurrency in [10, 25]:
            print(f"[*] Running TEST E (Mixed Workload) with concurrency {concurrency}...", flush=True)
            reqs = []
            for i in range(concurrency):
                mod = i % 5
                if mod == 0:
                    reqs.append(lambda: client.get("/api/v1/customers?search=Benchmark", headers=headers))
                elif mod == 1:
                    reqs.append(lambda: client.get("/api/v1/quotations?page=1&page_size=10", headers=headers))
                elif mod == 2:
                    reqs.append(lambda: client.get(f"/api/v1/purchase-orders/{data['po_id']}", headers=headers))
                elif mod == 3:
                    reqs.append(lambda: client.post(
                        f"/api/v1/purchase-orders/{data['po_id']}/calculate",
                        json={"persist_draft": False},
                        headers=headers
                    ))
                else:
                    reqs.append(lambda: client.get(f"/api/v1/quotations/{data['quotation_id']}/pdf", headers=headers))
            stats = await run_concurrency_batch(client, reqs)
            results["TEST_E"][concurrency] = stats
            print(f"    -> Done in {stats.total_wall_time_s:.2f}s | RPS: {stats.rps} | Avg: {stats.avg_ms}ms | Errors: {stats.errors}", flush=True)

    return results


def format_markdown_report(results: Dict[str, Dict[int, PerformanceStats]]) -> str:
    """Formats benchmark results as clean Markdown tables."""
    lines = []
    lines.append("# Quotation AI — Concurrency & Load Benchmark Report")
    lines.append(f"\n*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")

    test_titles = {
        "TEST_A": "TEST A: Concurrent Customer Search (`GET /api/v1/customers?search=...`)",
        "TEST_B": "TEST B: Concurrent Quotation History (`GET /api/v1/quotations?page=1&page_size=10`)",
        "TEST_C": "TEST C: Concurrent Quotation Calculation (`POST /api/v1/purchase-orders/{id}/calculate`)",
        "TEST_D": "TEST D: Concurrent PDF Retrieval (`GET /api/v1/quotations/{id}/pdf`)",
        "TEST_E": "TEST E: Mixed Workload (Search + History + PO Detail + Calculation + PDF)",
    }

    for test_key, title in test_titles.items():
        lines.append(f"### {title}\n")
        lines.append("| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
        suite_res = results.get(test_key, {})
        for conc, stats in sorted(suite_res.items()):
            lines.append(
                f"| {conc} | {stats.count + stats.errors} | {stats.count} | {stats.error_pct}% | {stats.timeouts} | {stats.rps} | {stats.avg_ms} | {stats.p50_ms} | {stats.p95_ms} | {stats.p99_ms} | {stats.max_ms} |"
            )
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    print("Executing Quotation AI Load Tests & Concurrency Benchmarks...")
    t_start = time.time()
    benchmark_results = asyncio.run(execute_benchmarks())
    t_total = time.time() - t_start
    print(f"Benchmarks completed in {t_total:.2f} seconds.\n")

    report_md = format_markdown_report(benchmark_results)
    print(report_md)

    # Save to scratch or print for docs
    output_path = os.path.join(os.path.dirname(__file__), "last_benchmark_result.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"\nSaved raw benchmark markdown to {output_path}")

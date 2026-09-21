"""
QUOTATION AI — PYTEST PERFORMANCE SUITE
Validates that Tests A, B, C, D, E complete with 0% error rate and acceptable response latencies.
"""

import pytest
import asyncio
from tests.performance.load_test_runner import execute_benchmarks


@pytest.mark.asyncio
async def test_performance_concurrency_benchmarks():
    """Run concurrent benchmark tests and verify zero errors across all concurrency levels."""
    results = await execute_benchmarks()

    # TEST A: Customer search
    assert "TEST_A" in results
    for conc, stats in results["TEST_A"].items():
        assert stats.error_pct == 0.0, f"Customer search failed at concurrency {conc}"
        assert stats.timeouts == 0

    # TEST B: Quotation history
    assert "TEST_B" in results
    for conc, stats in results["TEST_B"].items():
        assert stats.error_pct == 0.0, f"Quotation history failed at concurrency {conc}"
        assert stats.timeouts == 0

    # TEST C: Quotation calculation
    assert "TEST_C" in results
    for conc, stats in results["TEST_C"].items():
        assert stats.error_pct == 0.0, f"Quotation calculation failed at concurrency {conc}"
        assert stats.timeouts == 0

    # TEST D: PDF retrieval
    assert "TEST_D" in results
    for conc, stats in results["TEST_D"].items():
        assert stats.error_pct == 0.0, f"PDF retrieval failed at concurrency {conc}"
        assert stats.timeouts == 0

    # TEST E: Mixed workload
    assert "TEST_E" in results
    for conc, stats in results["TEST_E"].items():
        assert stats.error_pct == 0.0, f"Mixed workload failed at concurrency {conc}"
        assert stats.timeouts == 0

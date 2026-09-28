import concurrent.futures
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.parametrize("concurrency", [10, 25, 50])
def test_dashboard_endpoint_concurrency(auth_headers, concurrency):
    """
    Performance & Concurrency Validation:
    Run the dashboard endpoint with controlled concurrency (10, 25, 50 workers).
    Verifies connection pool stability, absence of pool exhaustion, and fast aggregation.
    """
    def fetch_dashboard():
        start = time.time()
        res = client.get("/api/v1/dashboard/summary?period=this_month", headers=auth_headers)
        duration = time.time() - start
        return res.status_code, duration

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(fetch_dashboard) for _ in range(concurrency)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    statuses = [r[0] for r in results]
    durations = [r[1] for r in results]

    # Every single request must return 200 OK without connection pool timeout or failure
    assert all(status == 200 for status in statuses), f"Failed statuses: {set(statuses)}"

    avg_duration = sum(durations) / len(durations)
    max_duration = max(durations)

    # Fast response validation: under 50 concurrent in-process requests, average is well under 3.0s
    assert avg_duration < 3.0, f"Average latency too high: {avg_duration:.3f}s"
    assert max_duration < 6.0, f"Max latency too high: {max_duration:.3f}s"

# Quotation AI — Concurrency & Load Benchmark Report

*Generated: 2026-09-21 14:25:54*

### TEST A: Concurrent Customer Search (`GET /api/v1/customers?search=...`)

| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 10 | 0.0% | 0 | 121.53 | 68.32 | 66.92 | 76.08 | 80.77 | 81.94 |
| 25 | 25 | 25 | 0.0% | 0 | 180.15 | 131.83 | 131.32 | 136.51 | 137.16 | 137.23 |
| 50 | 50 | 50 | 0.0% | 0 | 187.89 | 246.18 | 247.34 | 255.73 | 257.01 | 257.68 |

### TEST B: Concurrent Quotation History (`GET /api/v1/quotations?page=1&page_size=10`)

| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 10 | 0.0% | 0 | 38.77 | 221.75 | 225.99 | 252.57 | 253.8 | 254.11 |
| 25 | 25 | 25 | 0.0% | 0 | 47.83 | 450.23 | 463.47 | 510.47 | 513.39 | 514.14 |
| 50 | 50 | 50 | 0.0% | 0 | 56.21 | 707.77 | 693.8 | 845.99 | 863.43 | 872.98 |

### TEST C: Concurrent Quotation Calculation (`POST /api/v1/purchase-orders/{id}/calculate`)

| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 10 | 0.0% | 0 | 92.57 | 93.78 | 91.89 | 103.89 | 104.52 | 104.67 |
| 25 | 25 | 25 | 0.0% | 0 | 98.14 | 222.98 | 227.16 | 249.64 | 250.01 | 250.06 |
| 50 | 50 | 50 | 0.0% | 0 | 97.35 | 426.88 | 400.11 | 496.57 | 502.79 | 507.36 |

### TEST D: Concurrent PDF Retrieval (`GET /api/v1/quotations/{id}/pdf`)

| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 5 | 5 | 0.0% | 0 | 20.24 | 240.25 | 243.84 | 245.14 | 245.25 | 245.28 |
| 10 | 10 | 10 | 0.0% | 0 | 16.58 | 480.58 | 506.77 | 600.82 | 602.62 | 603.08 |

### TEST E: Mixed Workload (Search + History + PO Detail + Calculation + PDF)

| Concurrency | Requests | Success | Error % | Timeouts | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 10 | 0.0% | 0 | 55.04 | 120.61 | 132.11 | 177.45 | 180.13 | 180.8 |
| 25 | 25 | 25 | 0.0% | 0 | 64.38 | 259.93 | 265.53 | 379.31 | 381.56 | 382.24 |

# Quotation AI — Production Backend Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system build dependencies and security libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies into a virtual environment or directly
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Final minimal runtime image
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python site-packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy backend application and database migrations
COPY . /app

# Create unprivileged system user and group (UID/GID 10001)
RUN groupadd -g 10001 appgroup \
    && useradd -u 10001 -g appgroup -s /bin/false -m appuser \
    && mkdir -p /app/uploads \
    && chown -R appuser:appgroup /app \
    && chmod 750 /app/uploads

# Drop root privileges
USER 10001:10001

# Expose backend service port
EXPOSE 8000

# Health check against readiness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health/ready || exit 1

# Production entrypoint
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips=*"]


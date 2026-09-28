import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.routes.router import api_router
from app.db.init_db import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed reference data if not present (schema is managed via Alembic migrations)
    seed_initial_data()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic Precision Manufacturing Quotation Engine Backend",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory if exists
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

@app.get("/health/ready", tags=["Health"])
def readiness_check():
    from fastapi import Response, status
    from sqlalchemy import text
    from app.db.session import SessionLocal

    res_data = {
        "status": "ready",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
        "storage": "accessible",
    }
    
    # 1. Database readiness check
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
    except Exception as e:
        res_data["status"] = "unready"
        res_data["database"] = f"error: {str(e)}"
        return Response(
            content=json.dumps(res_data) if 'json' in globals() else str(res_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )

    # 2. Local uploads directory storage readiness check
    try:
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir, exist_ok=True)
    except Exception as e:
        res_data["status"] = "unready"
        res_data["storage"] = f"error: {str(e)}"
        return Response(
            content=json.dumps(res_data) if 'json' in globals() else str(res_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )

    return res_data

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Quotation AI Precision Manufacturing Engine API",
        "docs": "/docs",
        "version": settings.VERSION,
    }

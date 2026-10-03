import os
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Request, Response, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.security import get_current_user, AuthenticatedUser
from app.api.routes.router import api_router
from app.db.init_db import seed_initial_data

logger = logging.getLogger("quotation_ai.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed reference data if not present (schema is managed via Alembic migrations)
    seed_initial_data()
    yield
    # Shutdown

is_prod = settings.ENVIRONMENT == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic Precision Manufacturing Quotation Engine Backend",
    openapi_url=None if is_prod else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    lifespan=lifespan,
)

# 1. Production Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Azure Front Door Header Validation Middleware (if configured)
@app.middleware("http")
async def verify_front_door_header(request: Request, call_next):
    if settings.AZURE_FRONT_DOOR_ID:
        path = request.url.path
        if not path.startswith("/health"):
            fd_id = request.headers.get("X-Azure-FDID")
            if fd_id != settings.AZURE_FRONT_DOOR_ID:
                return Response(
                    content=json.dumps({"detail": "Direct origin access forbidden. Request must pass through Azure Front Door."}),
                    status_code=status.HTTP_403_FORBIDDEN,
                    media_type="application/json",
                )
    return await call_next(request)

# 3. Hardened CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-Azure-FDID",
        "X-Request-ID",
    ],
)

# 4. Uploads directory setup (Secured, NOT statically mounted)
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

@app.get("/uploads/{file_path:path}", tags=["Storage"])
async def get_uploaded_file(
    file_path: str,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Secure, tenant-isolated file retrieval endpoint.
    Replaces insecure static file mounting.
    Requires verified JWT authentication and enforces company ownership.
    """
    # Prevent path traversal
    normalized_path = os.path.normpath(file_path).lstrip("/\\")
    if ".." in normalized_path.split(os.path.sep):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid path traversal detected."
        )

    # Enforce multi-tenant company isolation first
    user_comp = current_user.company_id
    path_segments = normalized_path.replace("\\", "/").split("/")

    is_authorized = False
    if path_segments[0] == f"po_{user_comp}" or path_segments[0] == user_comp:
        is_authorized = True
    elif len(path_segments) > 1 and path_segments[1] == user_comp:
        is_authorized = True
    elif any(seg == user_comp or seg == f"po_{user_comp}" for seg in path_segments):
        is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot access files belonging to another company."
        )

    full_path = os.path.join(uploads_dir, normalized_path)
    if not os.path.isfile(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested file does not exist."
        )


    ext = os.path.splitext(full_path)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".webp": "image/webp",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(full_path, media_type=media_type)

# 5. Global Unhandled Exception Handler (Prevents stack trace / credential leakage)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please contact support."},
    )

# 6. Include API v1 router
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
        logger.error(f"Readiness database probe failure: {e}")
        res_data["status"] = "unready"
        res_data["database"] = "disconnected"
        return Response(
            content=json.dumps(res_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )

    # 2. Local uploads directory storage readiness check
    try:
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir, exist_ok=True)
    except Exception as e:
        logger.error(f"Readiness storage probe failure: {e}")
        res_data["status"] = "unready"
        res_data["storage"] = "unavailable"
        return Response(
            content=json.dumps(res_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )

    return res_data

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Quotation AI Precision Manufacturing Engine API",
        "docs": None if is_prod else "/docs",
        "version": settings.VERSION,
    }


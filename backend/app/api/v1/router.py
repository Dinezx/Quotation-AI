from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.customers import router as customers_router
from app.api.v1.rates import router as rates_router
from app.api.v1.purchase_orders import router as po_router
from app.api.v1.quotations import router as quotations_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(rates_router)
api_router.include_router(po_router)
api_router.include_router(quotations_router)

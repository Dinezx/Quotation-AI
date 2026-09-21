from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from app.api.routes.customers import router as customers_router
from app.api.routes.rates import router as rates_router
from app.api.routes.purchase_orders import router as po_router
from app.api.routes.quotations import router as quotations_router
from app.api.routes.company import router as company_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(rates_router)
api_router.include_router(po_router)
api_router.include_router(quotations_router)
api_router.include_router(company_router)


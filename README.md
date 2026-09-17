# Quotation AI — Collaborative Monorepo

Enterprise B2B SaaS platform for precision manufacturing machine shops and fabrication MSMEs. Automates customer Purchase Order (PO) intake, deterministic pricing calculation, rate matching against manufacturer cards, and commercial quotation generation.

---

## Repository Structure

```
Quotation-AI/
│
├── frontend/             # React 19 + TypeScript + Vite + Tailwind CSS (Dev 2)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/   # Common & Industrial UI widgets
│   │   ├── layouts/      # AppShell & framing
│   │   ├── pages/        # 9 precision engineering screens
│   │   ├── routes/       # React Router definitions
│   │   ├── hooks/        # TanStack Query custom hooks
│   │   ├── api/          # Axios HTTP clients & DTOs
│   │   ├── services/     # Domain services & mock datasets
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Formatters, cn helpers
│   │   ├── constants/    # Route paths & app constants
│   │   ├── context/      # AuthContext & DensityContext
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/              # FastAPI + SQLAlchemy + PostgreSQL (Supabase) + Alembic (Dev 1)
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/          # REST endpoints (auth, customers, rates, POs, quotes)
│   │   │   └── dependencies/    # FastAPI security & db dependencies
│   │   ├── core/                # Config, database engine, JWKS & security
│   │   ├── models/              # SQLAlchemy multi-tenant models
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── calculation/     # Authoritative deterministic pricing engine
│   │   │   ├── quotation/       # Quotation business logic
│   │   │   ├── purchase_order/  # PO lifecycle service
│   │   │   └── ai/              # Extraction interfaces
│   │   ├── utils/               # Formatters & utilities
│   │   └── main.py              # Application entry point
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # 17/17 passing test suite (JWKS, API, pricing)
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── docs/                 # Shared Engineering Specifications
│   ├── API_CONTRACT.md   # REST API endpoint specifications
│   ├── DATABASE.md       # Multi-tenant PostgreSQL schema
│   ├── ARCHITECTURE.md   # System design & boundaries
│   └── DEVELOPMENT.md    # Developer onboarding guide
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## Quick Start

### 1. Developer 1 — Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env       # Configure DATABASE_URL & Supabase credentials
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Run Tests: `python -m pytest tests/ -v`

### 2. Developer 2 — Frontend
```bash
cd frontend
npm install
cp .env.example .env       # Configure VITE_API_BASE_URL
npm run dev
```
- Local UI: `http://localhost:5173/`
- Build: `npm run build`
- Type Check: `npm run test`

---

## Documentation
- [docs/API_CONTRACT.md](file:///d:/Quotation%20AI/docs/API_CONTRACT.md): Full REST API endpoint specification.
- [docs/DATABASE.md](file:///d:/Quotation%20AI/docs/DATABASE.md): PostgreSQL schema & multi-tenant security model.
- [docs/ARCHITECTURE.md](file:///d:/Quotation%20AI/docs/ARCHITECTURE.md): System architecture, calculation flow, and boundaries.
- [docs/DEVELOPMENT.md](file:///d:/Quotation%20AI/docs/DEVELOPMENT.md): Step-by-step developer guide.

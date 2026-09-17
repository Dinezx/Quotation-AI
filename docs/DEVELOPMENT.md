# Quotation AI — Collaborative Development Guide

This guide describes local environment setup, testing routines, and developer workflows for both **Developer 1 (Backend)** and **Developer 2 (Frontend)**.

---

## 1. Repository Structure

```
Quotation-AI/
├── frontend/             # Developer 2 workspace (React, Vite, Tailwind, TanStack Query)
├── backend/              # Developer 1 workspace (FastAPI, SQLAlchemy, Alembic, JWKS)
├── docs/                 # Shared specifications (API contracts, DB schemas, architecture)
├── docker-compose.yml    # Container orchestration for local testing
└── .gitignore            # Monorepo git hygiene
```

---

## 2. Developer 1 — Backend Workflow

### Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
Populate `.env` with your Supabase database credentials (`DATABASE_URL`).

### Starting the Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
- API root: `http://localhost:8000/`
- Swagger UI docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Running Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Database Migrations
When modifying SQLAlchemy models in `app/models/`:
```bash
cd backend
# Generate migration script
alembic revision --autogenerate -m "describe_changes"
# Apply migrations
alembic upgrade head
```

---

## 3. Developer 2 — Frontend Workflow

### Setup
```bash
cd frontend
npm install
cp .env.example .env
```
Ensure `.env` contains:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### Starting the Frontend Dev Server
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173/` in your browser.

### Building for Production
```bash
cd frontend
npm run build
```

### Type Checking & Testing
```bash
cd frontend
npm run test
```

---

## 4. Environment Variables Guidelines

> [!CAUTION]
> **Strict Secret Segregation**:
> - Never expose `SUPABASE_SECRET_KEY` in `frontend/`.
> - Never commit `.env`, `.env.local`, or `.env.production`.
> - Keep `.env.example` updated whenever new variables are introduced.

---

## 5. Branching & Pull Request Protocol

1. **Backend features**: Work on `backend/<feature-name>`. Focus edits within `backend/` and `docs/API_CONTRACT.md`.
2. **Frontend features**: Work on `frontend/<feature-name>`. Focus edits within `frontend/`.
3. **Contracts & Schemas**: Any API shape changes must be documented in `docs/API_CONTRACT.md` before implementation.

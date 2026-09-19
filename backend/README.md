# Quotation AI — Backend Engine

FastAPI backend providing deterministic pricing calculations, asymmetric Supabase JWKS token verification, multi-tenant company isolation, and PostgreSQL persistence via SQLAlchemy and Alembic.

## Technology Stack
- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL (Supabase) & SQLite for local fallback
- **ORM & Migrations**: SQLAlchemy 2.0, Alembic
- **Authentication**: Asymmetric Supabase JWT Verification via JWKS (`ES256`, automatic key rotation via `kid`)
- **Testing**: pytest, pytest-cov, httpx
- **Pricing Engine**: Deterministic Python calculation utilizing `Decimal` with `ROUND_HALF_UP`

## Directory Structure
```
backend/
├── app/
│   ├── api/
│   │   ├── routes/              # Route endpoints (auth, customers, rates, purchase_orders, quotations)
│   │   │   ├── auth.py
│   │   │   ├── customers.py
│   │   │   ├── purchase_orders.py
│   │   │   ├── quotations.py
│   │   │   ├── rates.py
│   │   │   └── router.py
│   │   └── dependencies/        # FastAPI dependencies (auth, get_db, tenant isolation)
│   │       ├── auth.py
│   │       └── database.py
│   │
│   ├── core/                    # Core configuration, database engine, security & JWKS
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── jwks.py
│   │   └── security.py
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── services/                # Business logic services
│   │   ├── calculation/         # Authoritative deterministic pricing calculation engine
│   │   ├── quotation/           # Quotation generation service
│   │   ├── purchase_order/      # PO business service
│   │   ├── storage/             # File storage service
│   │   └── ai/                  # AI extraction interfaces (Phase 3)
│   │
│   ├── utils/                   # Utilities and formatters
│   └── main.py                  # FastAPI application entry point
│
├── alembic/                     # Database migrations
├── tests/                       # Unit & integration test suites
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment configuration template
└── README.md
```

## Getting Started

### 1. Environment Configuration
Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` points to your Supabase PostgreSQL pooler or local database, and configure your Supabase project parameters.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Migrations
```bash
alembic upgrade head
```

### 4. Start the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation (Swagger UI) is available at:
- `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 5. Run Automated Tests
```bash
python -m pytest tests/ -v
```
All unit tests, API integration tests, JWKS verification tests, pricing calculations, and Azure PO extraction providers (mocked) are validated automatically.

## PO Extraction Architecture & Providers
Quotation AI features a modular PO extraction provider architecture:
- **Mock Provider (`PO_EXTRACTION_PROVIDER=mock`)**: Safe default for local development, CI/CD, and offline testing without cloud credentials.
- **Azure Document Intelligence (`PO_EXTRACTION_PROVIDER=azure`)**: Uses the official `azure-ai-documentintelligence` SDK and Azure `prebuilt-layout` model to extract raw purchase order text, header metadata (PO number, date, vendor), paragraphs/lines, and line-item tables.

### Azure Document Intelligence Configuration
To enable the real Azure Document Intelligence extraction provider, configure the following environment variables in `.env`:
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key
PO_EXTRACTION_PROVIDER=azure
```
> [!IMPORTANT]
> Never commit real Azure credentials or expose them in client-side code, logs, or repository files.

### Anti-Pricing Invariant
AI/OCR is strictly responsible for document extraction and layout parsing. AI **never** calculates quotation prices, selects manufacturer rates, or determines margins/taxes. Extracted line items are matched against manufacturer rate cards and computed through the authoritative deterministic calculation engine.


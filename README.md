# SmartSchool

AI-powered multi-tenant school management system.

## Overview

SmartSchool is a SaaS platform for managing schools with AI-powered features. The system is built as a monorepo with three independently deployable services:

- **client/** — React + TypeScript + Vite (Frontend)
- **server/** — Node.js + Express + TypeScript (API Server)
- **ai-service/** — Python + FastAPI (AI Service)

## Features Implemented

### Authentication & Authorization
- User registration with email verification (token-based, 24h expiry)
- Login with JWT access tokens (15 min) + refresh tokens (persistent sessions in MongoDB)
- Forgot password / password reset via email (1-hour token expiry)
- Session management — logout invalidates refresh tokens, password reset kills all sessions
- Role-based access control (RBAC) with 8 roles: `super_admin`, `school_admin`, `principal`, `teacher`, `student`, `parent`, `accountant`, `hr`, `transport_manager`
- Route guards on the frontend (`RequireRole`) + role middleware on the backend
- Rate limiting via Redis (auth endpoints: 10 req/15 min, password reset: 5 req/hour)

### Email
- Transactional email via **Brevo SMTP** (nodemailer) — primary provider
- **Resend** API as automatic fallback
- Templates for email verification and password reset
- Requires IP authorization + verified sender in the Brevo dashboard (see `server/.env.example`)

### Core School Management
- **Schools** — multi-tenant school records with tenant resolution middleware (`x-school-id` header / active school context)
- **Students** — enrollment, profiles, student 360° view
- **Teachers** — staff management, teacher profiles
- **Classes & Subjects** — class creation, subject catalog, class-subject mapping
- **Academics** — academic years, departments, rooms

### Daily Operations
- **Attendance** — mark class attendance, student attendance history, analytics
- **Timetables** — visual timetable builder, class & teacher timetables
- **Assignments** — creation, submissions, grading workflow
- **Exams & Results** — exam setup, marks entry, results, report cards (PDF via pdfkit)
- **Leave Management** — leave requests with multi-role approval flow
- **Discipline** — incident records and follow-up tracking

### Finance
- Fee structures, invoice generation, payment tracking
- Collection dashboard with analytics, receipts (PDF)

### Communication
- **Messaging** — real-time conversations via Socket.io
- **Notifications** — in-app notifications, user preferences, email delivery via the shared mailer
- **Parent Portal** — dedicated parent view (children, assignments, transport)

### Transportation
- Vehicles, drivers, routes, stops, student transport assignments

### Documents & Admin
- **Documents** — cloud storage via Cloudinary
- **Audit Logs** — immutable action trail with filters (actor, entity, school, date range)
- **Import/Export** — Excel-based bulk import/export (xlsx)
- **Analytics** — role-specific dashboards (school admin, principal, teacher, accountant, student)

### AI Features
- **AI Assistant** — RAG-powered Q&A over school data (`/ai/query`)
- **Knowledge Base** — school admins upload documents; indexed via the AI service (`/index`, `/deindex`) for retrieval
- **Teacher Tools** — AI quiz generation with draft workflow: generate → review → edit → approve → publish (`AIDraft` persistence, full CRUD + approve endpoint)
- Guardrails layer on the Python side for safe AI responses

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://python.org/) (v3.10+)
- [Docker](https://docker.com/) & Docker Compose

## Setup

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- MongoDB on `localhost:27017`
- Redis on `localhost:6379` (rate limiting + BullMQ job queues)

### 2. Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

### 3. Server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

API available at [http://localhost:5000](http://localhost:5000)

Health check: `GET /health`

**Email configuration** — fill in `server/.env`:
- `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` — from Brevo dashboard → SMTP & API
- `EMAIL_FROM` — must be a **verified sender** in Brevo
- If Brevo IP blocking is active, authorize your public IP under Settings → Security → Authorized IPs

### 4. AI Service

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt  # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # macOS/Linux
cp .env.example .env
uvicorn app.main:app --reload
```

API available at [http://localhost:8000](http://localhost:8000)

Health check: `GET /health`

## Project Structure

```
smartschool/
├── client/                 # React frontend
│   ├── src/
│   │   ├── app/            # Routes and shared components
│   │   ├── features/       # Feature modules (22 domains)
│   │   ├── services/       # API service layer
│   │   ├── store/          # Redux state management
│   │   ├── hooks/          # Custom React hooks
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── ...
├── server/                 # Express API
│   ├── src/
│   │   ├── config/         # Database, environment config
│   │   ├── middlewares/    # Auth, tenant, validation, error
│   │   ├── modules/        # Feature modules (21 domains)
│   │   ├── jobs/           # Background jobs
│   │   ├── queues/         # BullMQ job queues
│   │   ├── repositories/   # Data access layer
│   │   ├── shared/         # Email (Brevo/Resend), tokens, Redis
│   │   └── routes/         # API routes
│   └── tests/              # Jest integration tests
├── ai-service/             # FastAPI AI service
│   ├── app/
│   │   ├── api/            # /process, /index, /deindex
│   │   ├── agents/         # AI agents
│   │   ├── rag/            # RAG pipelines
│   │   ├── embeddings/     # Embedding services
│   │   ├── retrieval/      # Retrieval logic
│   │   ├── guardrails/     # AI safety
│   │   ├── prompts/        # Prompt templates
│   │   ├── schemas/        # Pydantic models
│   │   └── services/       # Business logic
│   └── tests/              # Test suite
├── docker-compose.yml      # Local infrastructure
├── FEATURES.md             # Detailed implementation status
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start MongoDB + Redis |
| `cd client && npm run dev` | Start frontend dev server |
| `cd server && npm run dev` | Start API server |
| `cd server && npm run worker` | Start BullMQ worker process |
| `cd server && npm test` | Run server integration tests |
| `cd ai-service && uvicorn app.main:app --reload` | Start AI service |

## License

Proprietary

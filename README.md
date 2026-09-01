# SmartSchool

AI-powered multi-tenant school management system.

## Overview

SmartSchool is a SaaS platform for managing schools with AI-powered features. The system is built as a monorepo with three independently deployable services:

- **client/** — React + TypeScript + Vite (Frontend)
- **server/** — Node.js + Express + TypeScript (API Server)
- **ai-service/** — Python + FastAPI (AI Service)

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
- Redis on `localhost:6379`

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
│   │   ├── features/       # Feature modules
│   │   ├── services/       # API service layer
│   │   ├── store/          # State management
│   │   ├── hooks/          # Custom React hooks
│   │   ├── schemas/        # Validation schemas
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── ...
├── server/                 # Express API
│   ├── src/
│   │   ├── config/         # Database, environment config
│   │   ├── middlewares/     # Auth, tenant, validation, error
│   │   ├── modules/        # Feature modules
│   │   ├── jobs/           # Background jobs
│   │   ├── queues/         # Job queues
│   │   ├── repositories/   # Data access layer
│   │   ├── shared/         # Shared utilities
│   │   └── routes/         # API routes
│   └── ...
├── ai-service/             # FastAPI AI service
│   ├── app/
│   │   ├── api/            # API endpoints
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
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start MongoDB + Redis |
| `cd client && npm run dev` | Start frontend dev server |
| `cd server && npm run dev` | Start API server |
| `cd ai-service && uvicorn app.main:app --reload` | Start AI service |

## License

Proprietary

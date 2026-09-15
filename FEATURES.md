# SmartSchool — Implementation Status

> This document tracks what has been implemented across the platform as of September 2026.

## Architecture

| Service | Stack | Port |
|---------|-------|------|
| client | React 19 + TypeScript + Vite + Redux Toolkit + Tailwind | 5173 |
| server | Node.js + Express 5 + TypeScript + Mongoose + Socket.io | 5000 |
| ai-service | Python + FastAPI | 8000 |
| MongoDB | Database (Docker) | 27017 |
| Redis | Rate limiting + BullMQ queues (Docker) | 6379 |

---

## ✅ Fully Implemented

### Authentication (server/modules/auth)
- [x] Register — creates user (`pending_verification`), generates email verification token (24h), returns JWT pair
- [x] Email verification — `GET /verify-email?token=` page → `POST /auth/verify-email`
- [x] Resend verification
- [x] Login — JWT access token (15 min) + refresh token (MongoDB-backed sessions with user-agent/IP tracking)
- [x] Refresh token rotation
- [x] Logout — deletes session
- [x] Forgot password — `POST /auth/password-reset/request` (generic response, never reveals account existence)
- [x] Reset password — `POST /auth/password-reset/confirm` (1h token expiry; invalidates all sessions)
- [x] `GET /auth/me` — current user profile
- [x] RBAC — 9 roles: super_admin, school_admin, principal, teacher, student, parent, accountant, hr, transport_manager
- [x] Rate limiting (Redis): 10 req/15 min on auth, 5 req/hour on password reset
- [x] Frontend route guards: `ProtectedRoute` + `RequireRole` with dedicated Forbidden page

### Email Infrastructure (server/src/shared/email)
- [x] Primary provider: **Brevo SMTP** via nodemailer (port 587, TLS)
- [x] Fallback provider: **Resend API** (automatic if Brevo not configured or fails)
- [x] HTML templates: account verification, password reset
- [x] Graceful skip (console warning) when no provider is configured
- [x] Diagnostic script: `node test-email.mjs <recipient>` in `server/`

### Schools & Tenancy (server/modules/schools)
- [x] Multi-tenant school records
- [x] Tenant resolution middleware (`resolveTenant`) + active-school context on the client
- [x] School settings page, academic years
- [x] Super-admin school switcher

### People Management
- [x] **Students** — CRUD, profiles, Student 360° view, bulk import/export (Excel)
- [x] **Teachers** — CRUD, profiles, self-service view, bulk operations
- [x] **Guardians** — linked to students, parent portal access

### Academics
- [x] **Classes** — CRUD, class detail view
- [x] **Subjects** — catalog + class mapping
- [x] **Departments, Rooms, Academic Years**

### Daily Operations
- [x] **Attendance** — mark per class, history per student, class views, analytics dashboard
- [x] **Timetables** — drag-and-drop builder, class & teacher timetable views
- [x] **Assignments** — create, submit, grade; separate views for teacher/student/parent
- [x] **Exams & Results** — exam setup, marks entry, results view, PDF report cards (pdfkit)
- [x] **Leave Management** — requests, role-based review/approval (principal/HR)
- [x] **Discipline** — incident creation, list, detail with role-gated editing

### Finance (server/modules/finance)
- [x] Fee structures (grade-level pricing)
- [x] Invoice generation (bulk), invoice list/detail
- [x] Payment recording, PDF receipts
- [x] Collection dashboard with analytics
- [x] Student fee view for parents

### Communication
- [x] **Messaging** — 1:1 & group conversations, real-time via Socket.io
- [x] **Notifications** — in-app notification center, per-user preferences (channel selection), email delivery through the shared mailer
- [x] **Parent Portal** — dedicated layout: children overview, assignments, transport tracking

### Transport (server/modules/transport)
- [x] Vehicles, drivers, routes, stops CRUD
- [x] Student transport assignments
- [x] Parent-facing transport view

### Documents & Admin
- [x] Document uploads via **Cloudinary**
- [x] **Audit logs** — every mutating action recorded; filterable by actor/entity/school/date
- [x] **Analytics** — role-specific dashboards (school admin, principal, teacher, accountant, student)
- [x] Excel import/export utilities (xlsx)

### AI Features
- [x] **AI Assistant** (`POST /ai/query`) — RAG pipeline: question → embedding → retrieval from school knowledge base → guarded response; queries logged (`aiquerylogs`)
- [x] **Knowledge Base** (`POST/GET /ai/knowledge`, `DELETE /ai/knowledge/:id`) — admin uploads docs → sent to Python service `/index` (vector indexing), removable via `/deindex`
- [x] **Teacher Tools — Quiz Generation** — full draft workflow:
  - `POST /ai/teacher-tools/quiz/generate` — AI generates quiz draft
  - `GET /drafts` + `GET /drafts/:id` — review history
  - `PATCH /drafts/:id` — edit before approval
  - `POST /drafts/:id/approve` — approve & publish
  - `DELETE /drafts/:id`
  - Drafts persisted in `aidrafts` collection with review UI pages (Generate, History, Review)
- [x] Python AI service: agents, RAG pipelines, embeddings, retrieval, guardrails, prompt templates

### Background Jobs
- [x] BullMQ queues + dedicated worker process (`npm run worker`)
- [x] Notification dispatch jobs

---

## 🧪 Testing

- [x] Server integration tests (Jest + Supertest + mongodb-memory-server): auth suite (16 tests) passing, notifications, attendance suites
- [x] `sendEmail` mocked in tests — no real emails in CI

---

## 📌 Known Considerations

| Topic | Status |
|-------|--------|
| Email deliverability | Sending from `@gmail.com` via Brevo fails SPF/DKIM alignment → frequent Spam placement. Fix: verify a real domain in Brevo (DKIM/SPF/DMARC) before production. |
| Brevo IP restrictions | If `525 Unauthorized IP` occurs, authorize the server's public IP in Brevo Settings → Security → Authorized IPs. |
| Generic password-reset responses | Intentional — prevents account enumeration. Email send failures are logged server-side only. |
| Session roles | Roles are embedded in the JWT at login; role changes require re-login to take effect client-side. |

---

## 🚧 Not Yet Implemented / Ideas

- [ ] Payment gateway integration (Stripe/SSLCommerz) for online fee payment
- [ ] SMS notifications channel
- [ ] Two-factor authentication (2FA)
- [ ] Mobile app (React Native)
- [ ] Multi-language UI (i18n)
- [ ] Automated timetable conflict resolution suggestions
- [ ] AI proctoring / plagiarism detection for online exams

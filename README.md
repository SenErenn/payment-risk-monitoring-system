# Payment Risk Monitoring System

Internal management platform for simulating card payments, monitoring transactions, and performing risk analysis.

UI brand name: **PayScope**

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | ASP.NET Core Web API (.NET 10)      |
| Frontend | React + TypeScript + Vite           |
| Database | PostgreSQL + EF Core                |
| Auth     | JWT + Role Based Authorization      |

## Project Structure

```text
payment-risk-monitoring-system/
├── backend/
│   ├── PaymentRiskMonitoring.Api/
│   └── PaymentRiskMonitoring.Api.Tests/
├── frontend/
│   └── src/
├── PaymentRiskMonitoring.slnx
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

- [.NET SDK 10+](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### Option A — Local (recommended for development)

```bash
docker compose up -d postgres
cd backend/PaymentRiskMonitoring.Api
dotnet run --launch-profile http
```

In another terminal:

```bash
cd frontend
cp .env.example .env   # if needed
npm install
npm run dev
```

- API: `http://localhost:5067`
- UI: `http://localhost:5173` (use `localhost`, not `127.0.0.1`, for CORS)
- Swagger (Development only): `http://localhost:5067/swagger`

### Option B — Full Docker stack

```bash
cp .env.example .env
docker compose up -d --build
```

- UI: `http://localhost:8080`
- API: `http://localhost:5067`
- Postgres: `localhost:5433`

The API container migrates and seeds on startup when `Database__MigrateOnStartup` / `Database__SeedOnStartup` are true (default in compose).

### Development Users

| Email | Password | Role |
| ----- | -------- | ---- |
| `admin@payscope.local` | `Admin123!` | Admin |
| `analyst@payscope.local` | `Analyst123!` | Analyst |
| `viewer@payscope.local` | `Viewer123!` | Viewer |

These accounts are for local / demo use only.

### Demo scenario

1. Sign in as **Admin**.
2. Open **Dashboard** — confirm KPIs and charts for the last 24h.
3. Open **Transactions** — create a payment with amount **25000** and type **Online** (high risk).
4. Confirm a **Risk Alert** appears; open it and move **Open → UnderReview → Suspicious/Safe**.
5. Open a second browser tab on **Dashboard** / **Transactions** and create another payment — lists update live (SignalR **Live** badge).
6. Export filtered transactions as **CSV** or **Excel**.
7. Open **Audit Logs** — login, payment, review, and export entries should be listed.
8. Optional: adjust a **Risk Rule**, then create another payment and confirm scoring changed.

### Tests

```bash
dotnet test PaymentRiskMonitoring.slnx
# or
dotnet test backend/PaymentRiskMonitoring.Api.Tests/PaymentRiskMonitoring.Api.Tests.csproj
```

Coverage includes risk scoring bands, payment decline paths, export formatting, validators, refund not-found, JWT login, and role authorization (Admin vs Viewer on audit logs).

### Security notes

- Base `appsettings.json` has empty DB/JWT secrets; configure via Development settings or environment variables.
- Swagger UI is Development-only.
- CORS is explicit-origin (`Cors:Origins` or Development default `http://localhost:5173`).
- JWT required for APIs; SignalR uses `access_token` query for WebSockets.
- Response security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP default-src none.
- Change `Jwt__Secret` and Postgres password before any shared/demo deploy.
- Users admin UI is out of scope for v1 (placeholder only).

In Development, the API applies pending EF Core migrations and seeds demo data on startup (override with `Database:MigrateOnStartup` / `Database:SeedOnStartup`).

You can override values with environment variables such as:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__ExpiryMinutes`
- `Cors__Origins__0`
- `Database__MigrateOnStartup`
- `Database__SeedOnStartup`

Health check: `GET http://localhost:5067/api/health`

Database readiness check: `GET http://localhost:5067/health/ready`

Login: `POST http://localhost:5067/api/auth/login`

Manual migration command (optional):

```bash
dotnet ef database update --project backend/PaymentRiskMonitoring.Api/PaymentRiskMonitoring.Api.csproj
```

### Frontend (local details)

After login you are redirected to `/dashboard`.

Protected routes require a valid JWT from the backend.

Sidebar menu items depend on role:

| Role | Visible sections |
| ---- | ---------------- |
| Admin | Dashboard, Transactions, Risk Alerts, Merchants, Cards, Risk Rules, Users (placeholder), Audit Logs |
| Analyst | Dashboard, Transactions, Risk Alerts |
| Viewer | Dashboard, Transactions, Merchants |

Unauthorized deep links redirect to `/access-denied`.

Backend authorization policies:

- `AdminOnly` — Admin
- `AnalystOrAdmin` — Admin, Analyst
- `AdminOrViewer` — Admin, Viewer
- `StaffRead` — Admin, Analyst, Viewer

Merchant API (PR-009):

- `GET /api/merchants` — list with pagination / search / isActive filter (Admin, Analyst, Viewer)
- `GET /api/merchants/{id}` — detail (Admin, Analyst, Viewer)
- `POST /api/merchants` — create (Admin)
- `PUT /api/merchants/{id}` — update (Admin)
- `POST /api/merchants/{id}/activate` — activate (Admin)
- `POST /api/merchants/{id}/deactivate` — deactivate (Admin)

### Merchants UI (PR-010)

- Route: `/merchants` (list) and `/merchants/:id` (detail)
- Roles: Admin (full), Viewer (read-only)
- Features: search, status filter, pagination, create, edit, activate/deactivate

Card API (PR-011):

- `GET /api/cards` — list with pagination / search / status / type filter (Admin, Analyst)
- `GET /api/cards/{id}` — detail (Admin, Analyst)
- `POST /api/cards` — create demo card with fake token + masked number (Admin)
- `PUT /api/cards/{id}` — update credit/available limits (Admin)
- `POST /api/cards/{id}/status` — set status (Admin)
- `POST /api/cards/{id}/activate|block|deactivate` — status shortcuts (Admin)

No real PAN/CVV is accepted or stored.

### Cards UI (PR-012)

- Route: `/cards` (list) and `/cards/:id` (detail)
- Role: Admin only
- Features: search, status/type filters, pagination, create demo card, change limits, activate/block/deactivate/expire
- Detail page includes recent transactions and analytics KPIs (PR-027)

Transaction API (PR-013 / PR-016):

- `GET /api/transactions` — list with pagination, search, filters, and sorting (Admin, Analyst, Viewer)
  - Filters: status, merchantId, cardId, paymentType, createdFrom, createdTo, minAmount, maxAmount
  - Sort: sortBy + sortDirection (default createdAt desc)
- `GET /api/transactions/{id}` — detail (Admin, Analyst, Viewer)
- `POST /api/transactions` — create simulated payment (Admin, Analyst)
- Validates merchant/card, generates `TransactionCode`, checks amount/currency
- Basic decision: Approved or Declined (inactive merchant, non-active card, insufficient limit)
- Approved payments reduce card available limit
- Risk analysis via `RiskAnalysisService` (PR-020 / PR-021): `RiskScore`, `RiskLevel`, `RiskReasons`
- Score bands: 0–39 Low, 40–69 Medium, 70–100 High
- Foundation declines: inactive merchant / card / insufficient limit
- Advanced additive rules: High Amount, High Limit Usage, Velocity, Multiple Declines, Night High Amount, Sudden Amount Increase
- Rule thresholds/points/enabled are Admin-managed via Risk Rules (PR-025)

Payment Simulator UI arrives in PR-014.

### Payment Simulator UI (PR-014)

- Route: `/transactions` (list + simulator) and `/transactions/:id` (detail)
- Roles: Admin / Analyst / Viewer can view; Admin / Analyst can simulate payments
- Simulator fields: Merchant, Card, Amount, Currency, Payment Type → **Make Payment**
- Shows Approved / Declined result with decision message and link to detail
- List supports search, status filter, pagination, and merchant/card context filters
- Analyst can read merchants/cards for dropdowns (manage endpoints remain Admin-only)
- Card detail shows recent transactions for that card

### Payment Processing Rules (PR-015)

- Persists `DecisionReason` / `DeclineReason` on each transaction (detail screens stay accurate after reload)
- Strengthened amount validation: > 0, ≤ 1,000,000, max 2 decimal places
- Approved payments reduce available limit inside a DB transaction with card row lock (`FOR UPDATE`)
- Declined payments never change available limit
- Optional `idempotencyKey` (body or `Idempotency-Key` header): replay returns the original payment (`isReplay: true`, HTTP 200) without double-charging
- Same merchant/card/amount/currency/paymentType within 30 seconds without a key is treated as a duplicate replay
- Mismatched payload for an existing idempotency key → HTTP 409
- Simulator sends a fresh UUID idempotency key per click

### Transaction Query Backend (PR-016)

- `GET /api/transactions` supports richer filtering and sorting (Admin, Analyst, Viewer)
- Filters: `search`, `status`, `merchantId`, `cardId`, `paymentType`, `createdFrom`, `createdTo`, `minAmount`, `maxAmount`
- Sorting: `sortBy` (`createdAt` | `amount` | `status` | `riskScore` | `riskLevel` | `transactionCode` | `paymentType`) + `sortDirection` (`asc` | `desc`)
- Default sort remains `createdAt desc`
- Existing pagination and detail endpoint unchanged
- Transaction list UI filter controls arrive in PR-017

### Transaction Frontend (PR-017)

- Route: `/transactions` filter panel + table, `/transactions/:id` detail
- Filters (URL-synced): search, status, payment type, merchant, card, amount range, created from/to, sort by/direction
- Status / risk badges on list and detail
- Merchant and card related-transaction links from list rows and detail
- Viewer can filter; Admin/Analyst also simulate payments
- Uses PR-016 query API (no new backend endpoints)

### Localization (interim PR)

- Frontend supports **Türkçe** (default) and **English**
- Language switcher on login and top bar; preference stored in `localStorage`
- UI chrome translated across login, layout, dashboard, transactions, merchants, cards, placeholders
- Backend API messages remain English for now

### Refund Backend (PR-018)

- `POST /api/transactions/{id}/refunds` — full or partial refund (Admin, Analyst)
- `GET /api/transactions/{id}/refunds` — refund history (Admin, Analyst, Viewer)
- Omit `amount` to refund the remaining balance; provide `amount` for partial refund
- Restores card `availableLimit` (capped at credit limit)
- Blocks over-refund and refunds on non-Approved / fully Refunded transactions
- Updates transaction status to `PartiallyRefunded` or `Refunded`
- Transaction DTO includes `refundedAmount`, `refundableAmount`, `canRefund`, `refunds`
- Refund UI arrives in PR-019

### Refund Frontend (PR-019)

- Transaction detail shows refunded / refundable amounts and eligibility
- Admin and Analyst can create full-remaining or partial refunds from the detail page
- Viewer can review refund history (read-only)
- Refund history table on the transaction detail page
- Status chips and decision panel reflect `PartiallyRefunded` / `Refunded`

### Risk Analysis Engine (PR-020)

- Central `RiskAnalysisService` produces `RiskScore`, `RiskLevel`, and `RiskReasons` on each payment
- Reasons persisted as JSONB on `Transactions` and returned on list/detail DTOs
- Score bands: Low (0–39), Medium (40–69), High (70–100)
- Foundation decline signals: inactive merchant, non-active card, insufficient limit
- Transaction detail UI lists risk reason codes/messages

### Advanced Risk Rules (PR-021)

- Additive scoring with per-reason `points` breakdown on approved payments
- `HIGH_AMOUNT` — amount ≥ 10,000 (+45)
- `HIGH_LIMIT_USAGE` — projected credit usage ≥ 80% (+20)
- `VELOCITY` — ≥ 2 prior card transactions in the last 5 minutes (+25)
- `MULTIPLE_DECLINES` — ≥ 2 declines on the card in the last 24 hours (+25)
- `NIGHT_HIGH_AMOUNT` — amount ≥ 5,000 during UTC 22:00–05:59 (+20)
- `SUDDEN_AMOUNT_INCREASE` — amount ≥ 3× average of last 3–5 approved amounts on the card (+20)
- Score is the sum of matched rule points (capped at 100); no signals → `BASELINE` (15, Low)
- Defaults above are seeded into `RiskRules`; Admin can change threshold/points/enabled (PR-025)

### Risk Alerts Backend (PR-022)

- High-risk transactions automatically create an `Open` `RiskAlert` (one per transaction)
- `GET /api/risk-alerts` — list with pagination, search, filters (`status`, `riskLevel`, merchant/card/transaction, date range), sorting
- `GET /api/risk-alerts/open` — open alerts shortcut (`status=Open`)
- `GET /api/risk-alerts/{id}` — alert detail with transaction/merchant/card context and risk reasons
- Access: Admin and Analyst only
- Analyst review workflow added in PR-024

### Risk Alerts Frontend (PR-023)

- `/risk-alerts` list for Admin/Analyst with search, status, risk level, sorting, pagination (URL-synced)
- Default filter shows **Open** alerts
- `/risk-alerts/:id` detail with risk reasons, transaction/merchant/card links
- Status and risk level badges (High / Medium / Low visuals)
- Replaces the previous placeholder screen

### Analyst Review Workflow (PR-024)

- Status transitions: `Open` → `UnderReview` → `Safe` / `Suspicious` / `Closed` (terminal)
- `POST /api/risk-alerts/{id}/review` — Admin/Analyst; body `{ status, analystNotes }`
- Review audit fields: `AnalystNotes`, `ReviewedByUserId`, `ReviewedAt` (+ reviewer name/email on DTO)
- Notes required when deciding Safe / Suspicious / Closed
- Detail UI: start review, decision actions, notes, who/when reviewed
- List shows reviewer name and review time when available

### Risk Rules Admin (PR-025)

- Additive PR-021 rules stored in `RiskRules` (threshold, points, enabled)
- `GET /api/risk-rules`, `GET /api/risk-rules/{id}`, `PUT /api/risk-rules/{id}` — Admin only
- Admin `/risk-rules` UI to edit threshold / points / enabled
- `RiskAnalysisService` loads rules per payment; changes apply to new transactions immediately
- Foundation declines and score bands remain hardcoded

### Dashboard + Reporting (PR-026)

- `GET /api/dashboard/summary?from&to` — StaffRead (Admin/Analyst/Viewer); default window last 24 hours UTC
- KPIs: total transactions, volume, approved, declined, high risk, open alerts, approval rate, average amount
- Charts: hourly volume, status distribution, risk distribution, top merchants by volume
- Dashboard UI replaces the welcome placeholder; date-range filter applies to all widgets
- Approval rate = Approved / (Approved + Declined)

### Merchant / Card Analytics (PR-027)

- `GET /api/merchants/{id}/analytics?from&to` — StaffRead; volume, tx count, approval rate, risk alert/high-risk counts
- `GET /api/cards/{id}/analytics?from&to` — AnalystOrAdmin; spending, declines, risk alerts, available/credit limit
- Merchant and card detail pages show date-ranged KPI cards plus deep links to transactions/alerts
- Default analytics window: last 24 hours UTC

### SignalR Real-Time Monitoring (PR-028)

- Hub: `/hubs/monitoring` (JWT via `access_token` query; StaffRead to connect)
- Events: `TransactionCreated` (all staff), `RiskAlertCreated` (Admin/Analyst)
- Published after a newly created payment (idempotent replays do not broadcast)
- Frontend auto-reconnects; topbar shows Live / Reconnecting / Offline
- Dashboard, Transactions, and Risk Alerts refresh silently when events arrive

### Audit Logs + Export (PR-029)

- `AuditLogs` table + `GET /api/audit-logs` / `GET /api/audit-logs/actions` — Admin only
- Critical actions logged: login, merchant/card mutations, transaction create, refund, risk rule update, alert review, transaction export
- Admin `/audit-logs` UI with search, action/entity filters, and detail expand
- `GET /api/transactions/export?format=csv|excel` — StaffRead; respects list filters (max 5,000 rows)
- Transactions page CSV / Excel export buttons

## Architecture

```text
React (Vite)
    ↓ JWT / SignalR
ASP.NET Core Web API
    ↓ DI Services (Risk, Payments, Alerts, Audit, Dashboard, …)
Entity Framework Core
    ↓
PostgreSQL
```

Payment / risk flow:

```text
Payment request
  → validation (merchant/card/amount/limit)
  → RiskAnalysisService (rules from DB)
  → Transaction (+ optional RiskAlert if High)
  → Analyst review workflow
  → Audit log
```

### Finalization (PR-030)

- xUnit test project: risk engine, validators, export formatter, refund lookup, auth/authorization integration
- Security headers middleware; configurable CORS origins; migrate/seed flags for containers
- Full `docker compose` stack: Postgres + API + frontend (nginx)
- README: local + Docker setup, demo scenario, security notes, test commands
- Removed unused Samples API endpoints; Users UI marked out of scope for v1

### Final System Audit (PR-031)

- End-to-end compliance pass against original 30-PR plan
- Hardening: concurrent refund locking, card spending net of refunds, auth fallback policy, env gitignore, payment decision tests
- Docker API default environment set to Production (migrate/seed still enabled via flags)

### PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

PostgreSQL runs at `localhost:5433`.

Default development credentials:

- Host: `localhost`
- Port: `5433`
- Database: `payment_risk_monitoring`
- Username: `payscope`
- Password: `change_me`

After running the backend once in Development, these tables should exist:

- `Users`
- `Merchants`
- `Cards`
- `Transactions`
- `RiskAlerts`
- `RiskRules`
- `AuditLogs`
- `__EFMigrationsHistory`

If you want to customize these values, create a local `.env` file by copying `.env.example`.

## Development Status

This project is built incrementally across 30 PRs.

| PR      | Status | Description                    |
| ------- | ------ | ------------------------------ |
| PR-001  | Done   | Project foundation             |
| PR-002  | Done   | PostgreSQL + Docker infrastructure |
| PR-003  | Done   | Core domain models             |
| PR-004  | Done   | EF Core + initial migration    |
| PR-005  | Done   | API foundation                 |
| PR-006  | Done   | Authentication backend         |
| PR-007  | Done   | Authentication frontend        |
| PR-007.5 | Done  | Foundation & authentication audit |
| PR-008  | Done   | Main layout + role authorization |
| PR-009  | Done   | Merchant backend CRUD            |
| PR-010  | Done   | Merchant frontend                |
| PR-011  | Done   | Card backend CRUD                |
| PR-012  | Done   | Card frontend                    |
| PR-013  | Done   | Payment transaction backend      |
| PR-014  | Done   | Payment simulator frontend       |
| PR-015  | Done   | Payment processing rules         |
| PR-016  | Done   | Transaction query backend        |
| PR-017  | Done   | Transaction frontend filters     |
| i18n    | Done   | Turkish / English UI support     |
| PR-018  | Done   | Refund backend                   |
| PR-019  | Done   | Refund frontend                  |
| PR-020  | Done   | Risk analysis engine             |
| PR-021  | Done   | Advanced risk rules              |
| PR-022  | Done   | Risk alerts backend              |
| PR-023  | Done   | Risk alerts frontend             |
| PR-024  | Done   | Analyst review workflow          |
| PR-025  | Done   | Risk rules admin management      |
| PR-026  | Done   | Dashboard + reporting            |
| PR-027  | Done   | Merchant / card analytics        |
| PR-028  | Done   | SignalR real-time monitoring     |
| PR-029  | Done   | Audit logs + transaction export  |
| PR-030  | Done   | Tests, security, Docker, finalization |
| PR-031  | Done   | Final system audit & hardening       |

## License

Private / educational project.

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
│   └── PaymentRiskMonitoring.Api/
│       ├── Authorization/
│       ├── Controllers/
│       ├── Data/
│       ├── DTOs/
│       ├── Entities/
│       ├── Enums/
│       ├── Exceptions/
│       ├── Extensions/
│       ├── Middleware/
│       ├── Models/
│       ├── Options/
│       ├── Services/
│       └── Validators/
├── frontend/
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── layouts/
│       ├── navigation/
│       └── pages/
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

### Backend

```bash
docker compose up -d postgres
cd backend/PaymentRiskMonitoring.Api
dotnet run --launch-profile http
```

In Development, the API applies pending EF Core migrations and seeds demo users on startup.

Local development settings live in `appsettings.Development.json`.
Base `appsettings.json` does not contain usable database/JWT secrets.
You can override values with environment variables such as:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__ExpiryMinutes`

API runs at `http://localhost:5067`.

Swagger UI: `http://localhost:5067/swagger`

Health check: `GET http://localhost:5067/api/health`

Database readiness check: `GET http://localhost:5067/health/ready`

Login: `POST http://localhost:5067/api/auth/login`

Manual migration command (optional):

```bash
dotnet ef database update --project backend/PaymentRiskMonitoring.Api/PaymentRiskMonitoring.Api.csproj
```

### Development Users

| Email | Password | Role |
| ----- | -------- | ---- |
| `admin@payscope.local` | `Admin123!` | Admin |
| `analyst@payscope.local` | `Analyst123!` | Analyst |
| `viewer@payscope.local` | `Viewer123!` | Viewer |

These accounts are for local development only.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

After login you are redirected to `/dashboard`.

Protected routes require a valid JWT from the backend.

Sidebar menu items depend on role:

| Role | Visible sections |
| ---- | ---------------- |
| Admin | Dashboard, Transactions, Risk Alerts, Merchants, Cards, Risk Rules, Users, Audit Logs |
| Analyst | Dashboard, Transactions, Risk Alerts |
| Viewer | Dashboard, Transactions, Merchants |

Unauthorized deep links redirect to `/access-denied`.

Backend authorization policies:

- `AdminOnly` — Admin
- `AnalystOrAdmin` — Admin, Analyst
- `AdminOrViewer` — Admin, Viewer
- `StaffRead` — Admin, Analyst, Viewer

Merchant API (PR-009):

- `GET /api/merchants` — list with pagination / search / isActive filter (Admin, Viewer)
- `GET /api/merchants/{id}` — detail (Admin, Viewer)
- `POST /api/merchants` — create (Admin)
- `PUT /api/merchants/{id}` — update (Admin)
- `POST /api/merchants/{id}/activate` — activate (Admin)
- `POST /api/merchants/{id}/deactivate` — deactivate (Admin)

Merchant UI arrives in PR-010.

### Merchants UI (PR-010)

- Route: `/merchants` (list) and `/merchants/:id` (detail)
- Roles: Admin (full), Viewer (read-only)
- Features: search, status filter, pagination, create, edit, activate/deactivate

Card API (PR-011):

- `GET /api/cards` — list with pagination / search / status / type filter (Admin)
- `GET /api/cards/{id}` — detail (Admin)
- `POST /api/cards` — create demo card with fake token + masked number (Admin)
- `PUT /api/cards/{id}` — update credit/available limits (Admin)
- `POST /api/cards/{id}/status` — set status (Admin)
- `POST /api/cards/{id}/activate|block|deactivate` — status shortcuts (Admin)

No real PAN/CVV is accepted or stored. Card UI arrives in PR-012.
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
| PR-012+ | —      | See project plan for details   |

## License

Private / educational project.

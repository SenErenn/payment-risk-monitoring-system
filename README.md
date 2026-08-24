# Payment Risk Monitoring System

Internal management platform for simulating card payments, monitoring transactions, and performing risk analysis.

UI brand name: **PayScope**

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | ASP.NET Core Web API (.NET 10)      |
| Frontend | React + TypeScript + Vite           |
| Database | PostgreSQL + EF Core                |

## Project Structure

```text
payment-risk-monitoring-system/
├── backend/
│   └── PaymentRiskMonitoring.Api/
│       ├── Controllers/
│       ├── Data/
│       │   ├── Configurations/
│       │   └── Migrations/
│       ├── Entities/
│       └── Enums/
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

### Backend

```bash
docker compose up -d postgres
cd backend/PaymentRiskMonitoring.Api
dotnet run --launch-profile http
```

In Development, the API applies pending EF Core migrations on startup.

API runs at `http://localhost:5067`.

Health check: `GET http://localhost:5067/api/health`

Database readiness check: `GET http://localhost:5067/health/ready`

Manual migration command (optional):

```bash
dotnet ef database update --project backend/PaymentRiskMonitoring.Api/PaymentRiskMonitoring.Api.csproj
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

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
| PR-005+ | —      | See project plan for details   |

## License

Private / educational project.

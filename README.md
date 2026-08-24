# Payment Risk Monitoring System

Internal management platform for simulating card payments, monitoring transactions, and performing risk analysis.

UI brand name: **PayScope**

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | ASP.NET Core Web API (.NET 10)      |
| Frontend | React + TypeScript + Vite           |
| Database | PostgreSQL                          |

## Project Structure

```text
payment-risk-monitoring-system/
├── backend/
│   └── PaymentRiskMonitoring.Api/
├── frontend/
│   └── src/
├── PaymentRiskMonitoring.slnx
├── docker-compose.yml          (from PR-002)
├── .env.example
└── README.md
```

## Prerequisites

- [.NET SDK 10+](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (from PR-002)

## Getting Started

### Backend

```bash
docker compose up -d postgres
cd backend/PaymentRiskMonitoring.Api
dotnet run
```

API runs at `http://localhost:5067`.

Health check: `GET http://localhost:5067/api/health`

Database readiness check: `GET http://localhost:5067/health/ready`

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

- Database: `payment_risk_monitoring`
- Username: `payscope`
- Password: `change_me`

If you want to customize these values, create a local `.env` file by copying `.env.example`.

## Development Status

This project is built incrementally across 30 PRs.

| PR      | Status | Description                    |
| ------- | ------ | ------------------------------ |
| PR-001  | Done   | Project foundation             |
| PR-002  | Done   | PostgreSQL + Docker infrastructure |
| PR-003+ | —      | See project plan for details   |

## License

Private / educational project.

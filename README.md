# Payment Risk Monitoring System

Internal management platform for simulating card payments, monitoring transactions, and performing risk analysis.

UI brand name: **PayScope**

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | ASP.NET Core Web API (.NET 10)      |
| Frontend | React + TypeScript + Vite           |
| Database | PostgreSQL (from PR-002)            |

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
cd backend/PaymentRiskMonitoring.Api
dotnet run
```

API runs at `http://localhost:5067`.

Health check: `GET http://localhost:5067/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Development Status

This project is built incrementally across 30 PRs.

| PR      | Status | Description                    |
| ------- | ------ | ------------------------------ |
| PR-001  | Done   | Project foundation             |
| PR-002+ | —      | See project plan for details   |

## License

Private / educational project.

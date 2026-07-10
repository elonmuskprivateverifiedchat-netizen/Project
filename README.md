# Project

This repository contains a monorepo for the XpressProFX platform.

## Key Contents

- `artifacts/api-server` - Backend API server built with Express, Drizzle ORM, and Socket.IO.
- `lib/db` - Shared Drizzle ORM database schema and config.
- `artifacts/trading-platform` - Frontend trading platform application.
- `artifacts/mockup-sandbox` - UI mockup sandbox application.
- `infra` - Deployment support files for nginx and systemd.
- `docker-compose.yml` - Local development stack for API and PostgreSQL.
- `DEPLOY.md` - Deployment notes and platform hints.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Start the local stack:

```bash
docker-compose up --build
```

3. Open the API at `http://localhost:3000`.

## Build

Build the API server package:

```bash
pnpm --filter @workspace/api-server run build
```

## Database

The backend uses PostgreSQL and Drizzle ORM. Local compose sets:

- `DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres`

The API can run migrations automatically in local compose using `DB_AUTO_MIGRATE=true`.

## Deployment

- `artifacts/api-server/Dockerfile` is configured for container builds.
- `railway.json` is included for Railway deployment.
- `infra/nginx/api-server.conf` and `infra/systemd/api-server.service` provide VPS deployment examples.

## Useful Commands

- `pnpm install`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/api-server run test`
- `docker-compose up --build`

## Notes

- The monorepo is managed with `pnpm-workspace.yaml`.
- The API is built into `artifacts/api-server/dist`.
- Use `DEPLOY.md` for deployment guidance and environment setup.

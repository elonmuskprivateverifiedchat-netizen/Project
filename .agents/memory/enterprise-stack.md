---
name: XpressProFX Enterprise Stack
description: Key conventions, auth flow, package choices, and DB patterns for the XpressProFX monorepo
---

# XpressProFX Enterprise Stack

## Auth
- Session tokens stored in `userSessionsTable`; middleware in `middleware/auth.ts` validates Bearer token and attaches `req.userId` + `req.isAdmin`.
- Admin 2FA: POST `/api/auth/admin-step1` → POST `/api/auth/admin-step2` → returns `{token, isHeadAdmin}`.
- SMTP not configured in dev — OTP codes returned as `_devCode` in dev mode.
- Admin master creds are obfuscated in `src/routes/auth.ts` (do not hardcode in plain text).

## Middleware Order (app.ts)
1. trust proxy → helmet → compression → pino-http → body parsers → CORS → rate limiters → /healthz (top-level) → /api router → 404 handler → error handler

## Route Architecture
- Public: `/healthz` (top-level), `/api/healthz`, `/api/auth/*`, `/api/webhooks/*`, `/api/trading/pairs`, `/api/trading/rates*`
- Auth-gated order: `/api/trading/order` (explicit req.userId check inside public router)
- Protected (requireAuth): all other /api/* routes

## Rate Limiting
- Global: 100 req / 15 min (`RateLimit-*` headers returned)
- Auth: 5 req / 15 min  
- Nginx config adds additional layer at reverse proxy level

## Test Setup
- Jest + Supertest in `__tests__/` directory (5 suites, 24 tests)
- Run: `pnpm --filter @workspace/api-server run test`
- DB must be mocked via `jest.mock("@workspace/db")` for unit tests
- jest.config.ts uses ts-jest with CommonJS transform and workspace path aliases

## New Endpoints Added
- `GET /api/trading/pairs` — 15 forex/crypto/metal pairs
- `GET /api/trading/rates[?pairs=EUR/USD,GBP/USD]` — live rates
- `GET /api/trading/rates/:pair` — single pair rate
- `POST /api/trading/order` — place order (auth required)
- `GET /api/investment/plans` — 4 investment tiers (auth required)
- `GET /api/investment/plans/:id` — plan detail
- `POST /api/investment/subscribe` — subscribe to plan (auth required)
- `POST /api/webhooks/payment` — payment gateway callback
- `POST /api/webhooks/kyc` — KYC provider callback

## DB Stack
- Drizzle ORM + Neon PostgreSQL — NOT Prisma (never switch)
- Pooled connection for app queries; direct URL for migrations only

## Deployment Configs
- `railway.json`, `railpack.json`, `.railwayignore` — Railway deployment
- `ecosystem.config.js` — PM2 cluster mode
- `nginx.conf` — reverse proxy with SSL, rate limiting, static file serving
- `.env.example` — all required env vars documented

**Why:** Consistent reference for future sessions to avoid re-discovering these constraints.

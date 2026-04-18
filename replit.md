# XpressProFX / ExpressPro101 — Full-Stack Forex Trading Platform

## Project Overview
A comprehensive forex trading and investment broker platform with wallet connectivity, admin control panel, referral system, KYC gating, IP-based demo accounts, and live trading charts.

## Architecture

### Monorepo (pnpm workspaces)
- `artifacts/trading-platform/` — React + Vite frontend (ShadCN UI, TanStack Query, Wouter routing)
- `artifacts/api-server/` — Express.js REST API with Fastify-style logging (pino)
- `lib/db/` — Drizzle ORM + PostgreSQL schema

### Key Technologies
- **Frontend**: React 18, Vite, ShadCN UI, TanStack Query, Wouter, TypeScript
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, crypto (Node built-in)
- **Auth**: Session-based (in-memory Map) with seed phrase / private key login system

## Admin C-Panel Access

| Credential | Value |
|---|---|
| Email | `admin@admin.com` |
| Seed Phrase (12-word) | `admin@admin.com` × 12 |
| Seed Phrase (24-word) | `admin@admin.com` × 24 |
| Private Key | `8157257198001` |
| Login Code | `999777` |

Admin login URL: `/auth/admin`

## Key Features

### Wallet Connect
- Import via seed phrase (12 or 24 words), private key, or wallet address
- Supports up to 5 connected wallets per user
- Connected wallets stored in `connected_wallets` table with importMethod (seed_phrase/private_key/address)

### Referral System
- Each user gets a unique referral code (format: `XPF` + 8 hex chars)
- $500 USDC jackpot paid to referrer when their referee completes first trade
- 3 months validity for new users, 1 month for returning users
- Referral code field on registration form
- Referral widget on Dashboard showing earnings + copyable code

### IP-Based Demo Accounts
- `GET /api/auth/demo` — creates or retrieves a demo account based on client IP
- Each IP gets a unique demo account with $10,000+ USDC seeded balances
- Demo accounts have realistic sample transactions pre-loaded
- "Try Demo Account (Auto-Login)" button on Login page

### KYC System
- Users submit documents via the KYC page
- Admin reviews in Admin C-Panel → KYC tab
- Status: unverified → pending → verified / rejected

### Admin Trading Chart Controls
- Live BTC/USDT chart with real-time simulation (updates every 2 seconds)
- Admin can override trade values (price override, force win/loss, set prediction)
- Balance adjustment panel to credit/debit any user's main wallet
- All actions trigger in-app notifications to the affected user

## API Routes

### Auth (`/api/auth`)
- `POST /register` — register with optional referral code
- `POST /login` — seed phrase / private key login
- `POST /admin-login` — admin-specific login with login code
- `GET /demo` — IP-based demo account creation/retrieval
- `POST /verify-otp`, `POST /resend-otp` — email verification
- `POST /change-password` — authenticated password change

### Admin (`/api/admin`)
- `GET /stats` — platform statistics
- `GET /users` — all users with KYC status
- `PATCH /users/:id/kyc` — update user KYC status
- `PATCH /users/:id/role` — change user role
- `PATCH /users/:id/balance` — adjust user's main wallet balance
- `GET /kyc-documents` — all submitted KYC docs
- `PATCH /kyc-documents/:id` — approve/reject a KYC document
- `GET /transactions` — all transactions
- `PATCH /transactions/:id/withdrawal` — approve/reject withdrawal
- `GET /cards` — all card requests
- `PATCH /cards/:id/status` — approve/decline card request

### Wallets (`/api/wallets`)
- `GET /` — all user wallets
- `POST /connect` — import via seed_phrase, private_key, or address
- `DELETE /:id` — remove connected wallet

### Referrals (`/api/referrals`)
- `GET /info` — user's referral code, total earned, pending bonuses
- `POST /claim` — trigger referral bonus payout when user starts trading

## Database Schema (Drizzle ORM)
Key tables: `users`, `wallets`, `connected_wallets`, `transactions`, `notifications`, `kyc_documents`, `otp_codes`, `trades`, `p2p_listings`, `p2p_orders`, `card_requests`, `messages`, `support_tickets`, `referral_bonuses`

Added fields for this build:
- `users.referralCode`, `users.referredBy`, `users.referralValidUntil`, `users.isNewUser`
- `connected_wallets.importMethod`, `connected_wallets.label`
- New table: `referral_bonuses` (referrerId, referredUserId, bonusAmount, status, paidAt)

## Workflows
- `artifacts/api-server: API Server` — Express backend on port 8080
- `artifacts/trading-platform: web` — Vite dev server

## Frontend Pages
- `/auth/login` — Main login (seed phrase + PIN)
- `/auth/admin` — Admin C-Panel login (separate credentials)
- `/auth/register` — Registration with referral code field
- `/dashboard` — Dashboard with referral widget
- `/wallet` — Wallet management with seed phrase/key import tabs
- `/admin` — Admin control panel (requires admin session)

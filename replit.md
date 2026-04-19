# XpressProFX — Professional Forex Trading Platform

## Project Overview
A comprehensive forex trading and investment broker platform with wallet connectivity, admin control panel, referral system, KYC gating, IP-based demo accounts, and live trading charts.

## Architecture

### Monorepo (pnpm workspaces)
- `artifacts/trading-platform/` — React + Vite frontend (ShadCN UI, TanStack Query, Wouter routing, @react-oauth/google)
- `artifacts/api-server/` — Express.js REST API with pino logging
- `lib/db/` — Drizzle ORM + PostgreSQL schema

### Key Technologies
- **Frontend**: React 18, Vite, ShadCN UI, TanStack Query, Wouter, TypeScript
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, nodemailer, crypto
- **Auth**: DB-backed persistent sessions via `user_sessions` table (no in-memory state)

## Admin C-Panel Access

| Credential | Value |
|---|---|
| Email | `admin@admin.com` |
| Private Key | `8157257198001` |
| Login Code | `999777` |
| Head Admin Email | trevionjamielynn800@gmail.com |

Admin login: Toggle hidden on Login page (small · button) → enter master creds + admin rep email → 4-digit OTP via email → `/c-panel`

**Credentials are obfuscated in source via base64** (see `auth.ts` `_creds` / `_headParts`).

## Session Storage Keys (Frontend)
- `xpfx_token` — session token
- `xpfx_user_id` — user ID
- `xpfx_role` — user role
- `xpfx_is_admin` — admin flag (sessionStorage)

## Key Features

### Authentication
- Unified login page with hidden admin toggle (single dot button at bottom)
- User login: email + seed phrase/wallet key + PIN
- Admin 2FA: master creds → admin rep email → 4-digit OTP (30-min expiry, rotates on each request)
- IP-based demo accounts (one per IP, persist across restarts)
- DB-backed sessions — login persists through server restarts

### Wallet Connect
- Import via seed phrase (12 or 24 words), private key, or wallet address
- Supports up to 5 connected wallets per user
- Connected wallets stored in `connected_wallets` table

### Referral System
- Each user gets a unique referral code (format: `XPF` + 8 hex chars)
- $500 USDC jackpot paid to referrer when their referee completes first trade
- Tracked in `referral_bonuses` table

### Google OAuth (Registration Auto-fill)
- Add `VITE_GOOGLE_CLIENT_ID` env var to enable
- Button appears on registration Step 1 to auto-fill name and email from Google account
- No Google OAuth for login — only registration form pre-fill

### Admin Rep Management
- Head admin can add/remove admin representatives via `/c-panel`
- Admin reps can access the C-Panel and manage users
- Only head admin can add/remove other admins

### Email Service
- Uses nodemailer for OTP and notification emails
- Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` env vars for production SMTP
- Falls back to Ethereal test SMTP in dev (logs preview URL to console)

## Database Tables (Drizzle + PostgreSQL)
- `users` — user accounts
- `user_sessions` — persistent login sessions (replaces in-memory Map)
- `admin_reps` — approved admin representative emails (with UUID for session linking)
- `admin_otp` — 4-digit OTPs for admin 2FA (30-min expiry)
- `wallets` — main, trading, social wallets per user
- `connected_wallets` — imported external wallets
- `transactions` — deposit/withdrawal/trade records
- `trades` — individual trade positions
- `kyc_documents` — KYC submission data
- `notifications` — in-app notifications
- `card_requests` — debit card requests
- `bank_accounts` — linked bank accounts
- `p2p_chat` — P2P trading chat messages
- `referral_bonuses` — referral reward tracking
- `otp_codes` — email verification OTPs

## API Routes
All routes under `/api`:
- `GET /api/health` — health check (public)
- `/api/auth/*` — authentication (public): register, login, demo, admin-step1, admin-step2, admin-reps
- All other routes require Bearer token from session

## Environment Variables Needed
- `DATABASE_URL` — PostgreSQL connection string (set automatically by Replit DB)
- `SMTP_HOST` — SMTP server (e.g. `smtp.gmail.com`)
- `SMTP_USER` — SMTP username/email
- `SMTP_PASS` — SMTP password or app password
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth Client ID for registration auto-fill (optional)

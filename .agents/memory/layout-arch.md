---
name: Layout Architecture
description: Key routing and layout decisions for the XpressProFX frontend shell
---

Dashboard nav item links to `/dashboard`, NOT `/`. The `/` route is the public marketing Home page; `/dashboard` is the authenticated portfolio view.

Live market ticker uses `useForexRates()` hook (singleton Socket.io connection via `getSocket()`). It's safe to call from Layout — the socket is shared across the whole app.

Sidebar shows total portfolio equity computed from `useWallets()` sum — this hits the React Query cache so no extra API call when already on the dashboard.

**Why:** Mixing the public Home (`/`) with the authenticated Dashboard nav caused the nav to always highlight Dashboard even on other pages. Explicit `/dashboard` path fixes active state detection.

**How to apply:** Any new nav items must use full path strings. The active check is `location.startsWith(path)`.

---
name: Design System Tokens
description: Token conventions for the XpressProFX trading platform CSS design system
---

Dark mode is `:root` default (not `.dark` class). `.dark` class mirrors `:root`. `.light` class provides the light override.

Key token values (dark mode):
- `--background: 216 28% 7%` — very dark navy
- `--card: 215 25% 10%` — elevated card surface
- `--sidebar: 216 32% 6%` — deepest surface
- `--primary: 174 68% 38%` — teal brand/interactive
- `--buy: 142 71% 43%` — emerald green (long/profit/buy)
- `--sell: 4 80% 58%` — rose red (short/loss/sell)

**Why:** Trading platforms are dark-first (IBKR, Binance, Kraken). Buy/sell must be semantically distinct from the primary brand teal to avoid confusion. `--destructive` (errors) is different from `--sell` (short positions).

**How to apply:** Always use `.text-profit`/`.text-loss`/`.bg-profit`/`.bg-loss` utilities for P&L values. Use `.num` utility class on ALL price, balance, and numeric values for JetBrains Mono tabular rendering. Use `.badge-buy`/`.badge-sell` for position type badges.

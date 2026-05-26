# Environment Strategy — TradeOS Core

**Date**: 2026-05-26
**Purpose**: define the three-tier environment model and prevent staging/production data leaks.

## Current Reality

TradeOS Core has **one Supabase project** (TradeOS Core Staging) and **one Vercel project** (tradeos-core.vercel.app). The Vercel production deployment currently points to the staging database. There is no separate production database yet.

This is acceptable for pre-pilot development but must be resolved before any real buyer data is stored.

## Three-Tier Model

```
Local/Test                 Staging                      Production
─────────────              ───────                      ──────────
Node 20 + pnpm             Vercel Preview               Vercel Production
Local Supabase (Docker)    Supabase: TradeOS Core       Supabase: TradeOS Core
or staging project         Staging                      Production
                           ──────────                   ──────────
Seed data: yes             Seed data: yes               Seed data: NO
Demo auth: true            Demo auth: false             Demo auth: false
Can mutate schema          Can mutate schema            NO schema mutate
Can seed pilot             Can seed pilot               NO seed
                           Can run E2E                   E2E read-only
```

## Current Assignments

| Tier | Supabase Project | Vercel Environment | Status |
|---|---|---|---|
| Local | Docker or staging project | N/A | Available |
| Staging | TradeOS Core Staging (`ulnjanlaehfmxurreibj`) | Preview / PR deploys | ACTIVE |
| Production | NOT CREATED | `tradeos-core.vercel.app` | **Production Vercel currently points to Staging DB** |

## Rules

### 1. Staging DB is the only shared database

All local dev, preview deployments, E2E tests, and the Vercel production deployment currently connect to the same Supabase project (TradeOS Core Staging). This means:

- **Preview deployments read and write staging data**
- **Vercel production reads and writes staging data**
- **There is no data isolation between environments at the database level**

Mitigation: application-level tenant isolation (`organizationId` scoping) prevents cross-tenant data leaks. But there is no environment-level isolation.

### 2. Do NOT store real buyer data until production DB exists

The staging database is shared and mutable. Real buyer data must not be stored in staging. Until a production Supabase project is created:

- All pilot data must use the `pilot-supplier-switch-01` organization (isolated by org scoping)
- No real customer email, phone, or financial data should be used
- All data can be wiped without notice

### 3. Production DB creation triggers

A production Supabase project must be created when ANY of these is true:

1. A real buyer/pilot team will store actual trade data
2. A paid pilot starts with real commercial information
3. The app needs environment-level isolation for compliance

Until then, the single staging project is sufficient for development and pilot validation.

### 4. Migration strategy for production DB

When production DB is created:

1. Create new Supabase project (TradeOS Core Production)
2. Run all migrations from scratch against production DB via `prisma migrate deploy`
3. Set `DATABASE_URL` and `DIRECT_URL` in Vercel production environment to point to production DB
4. Keep staging DB for continued development
5. Verify tenant isolation: staging data must not appear in production

### 5. Environment variable isolation

| Variable | Local | Staging/Vercel Preview | Production |
|---|---|---|---|
| `DATABASE_URL` | Local or staging | Staging pooler | Production pooler |
| `DIRECT_URL` | Local or staging | Staging direct | Production direct |
| `ALLOW_DEMO_AUTH` | `true` | `true` (preview) / `false` (prod) | `false` |
| `AI_EXECUTION_ENABLED` | `false` | `false` | `false` |
| `WORKER_CONSUMING_ENABLED` | `false` | `false` | `false` |

## Next Action

When a real pilot is confirmed, create `docs/SUPABASE_PRODUCTION_SETUP.md` with the production project creation steps.
# Environment Strategy — TradeOS Core

**Date**: 2026-05-26
**Purpose**: define the three-tier environment model and prevent staging/production data leaks.

## Current Reality

TradeOS Core has **two Supabase projects** (Staging + Production) and **one Vercel project** (tradeos-core.vercel.app). The Vercel production deployment now points to the production database. Staging data and production data are fully isolated.

**Production project created 2026-05-27.**

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

| Tier       | Supabase Project                              | Vercel Environment        | Status      |
| ---------- | --------------------------------------------- | ------------------------- | ----------- |
| Local      | Docker or staging project                     | N/A                       | Available   |
| Staging    | TradeOS Core Staging (`ulnjanlaehfmxurreibj`) | Preview / PR deploys      | ACTIVE      |
| Production | `tradeos-core-prod` (`okkzfmtwrjkfjzyprrwh`)  | `tradeos-core.vercel.app` | ✅ ISOLATED |

## Rules

### 1. Two databases — staging and production are separate

Vercel production connects to the production Supabase project (`tradeos-core-prod`). Preview/PR deploys and local dev connect to the staging Supabase project (`TradeOS Core Staging`).

- **Production DB is clean** — no seed data, no demo data, no pilot data
- **Staging DB has seed data** — demo org, demo user, pilot Supplier Switch data
- **Environment-level isolation is now in place**

### 2. Production DB is isolated — real buyer data goes here

The production database (`tradeos-core-prod`) is now isolated from staging. Real buyer data should be stored in production only.

- Staging retains pilot/test data (`pilot-supplier-switch-01`)
- No real customer data should ever enter the staging database
- Staging can be wiped without notice

### 3. Production DB is already created (2026-05-27)

The production Supabase project (`tradeos-core-prod`) was created and configured:

1. ✅ Project created (ref: `okkzfmtwrjkfjzyprrwh`, region: ap-southeast-2)
2. ✅ All 12 Prisma migrations applied (1 baselined: `20260522_deal_orgid`)
3. ✅ Vercel production env vars updated (DATABASE_URL, DIRECT_URL, API keys, JWT secret)
4. ✅ Staging DB kept for continued development
5. ✅ Verified: health endpoint, demo auth blocked, E2E endpoint blocked

### 5. Environment variable isolation

| Variable                   | Local            | Staging/Vercel Preview            | Production        |
| -------------------------- | ---------------- | --------------------------------- | ----------------- |
| `DATABASE_URL`             | Local or staging | Staging pooler                    | Production pooler |
| `DIRECT_URL`               | Local or staging | Staging direct                    | Production direct |
| `ALLOW_DEMO_AUTH`          | `true`           | `true` (preview) / `false` (prod) | `false`           |
| `AI_EXECUTION_ENABLED`     | `false`          | `false`                           | `false`           |
| `WORKER_CONSUMING_ENABLED` | `false`          | `false`                           | `false`           |

## Next Action

When a real pilot is confirmed, create `docs/SUPABASE_PRODUCTION_SETUP.md` with the production project creation steps.

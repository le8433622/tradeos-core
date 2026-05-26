# Production State — TradeOS Core

**Last updated**: 2026-05-26
**Status**: ⚠️ NO production Supabase database exists. Vercel production points to **staging DB only**. See `docs/ENVIRONMENT_STRATEGY.md` for the full environment plan.

## Current Production Commit

- `181af5a` — feat: add environment strategy, fix production state, seed pilot case (#87)

## Vercel Deployment

- **URL**: `https://tradeos-core.vercel.app`
- **Latest deployment ID**: (record from Vercel dashboard)
- **Status**: READY (verified)
- **Health endpoint**: `/api/health` → 200

## ⚠️ Critical: No Production DB

The Vercel production deployment (`tradeos-core.vercel.app`) currently connects to the **staging Supabase project** (TradeOS Core Staging). There is **no production Supabase project**.

This means:

- All migration, seed, and pilot operations affect the same database that Vercel production reads from
- `ALLOW_DEMO_AUTH` is currently `true` on staging (production Vercel inherits staging env vars)
- Real buyer data must NOT be stored until a production Supabase project is created

## Supabase

- **Project ref**: `ulnjanlaehfmxurreibj` (staging — NO production project)
- **Prisma migrations total**: 11 rows in `_prisma_migrations`
- **Supplier Switch applied**: 5 successful (PurchaseBaseline, SupplierAlternative, SwitchDecisionReport, BuyerDecisionFields, OutcomeLearning/CheckpointType)
- **Failed/rolled-back**: 2 historical (wrong order before #85 fix)
- **Pending migrations**: None
- **Last backup**: (not recorded — run pg_dump or Supabase snapshot)

## Row Counts (staging — pilot tenant)

| Table | Count | Notes |
|---|---|---|
| Organization | 2 | demo-org + pilot-supplier-switch-01 |
| User | 2 | owner@tradeos.local + pilot-owner@tradeos.local |
| SourcingRun | 5 | 1 active pilot case + 4 stale from seed retries |
| PurchaseBaseline | 5 | 1 active + 4 stale |
| SupplierAlternative | 6 | 2 per run (Baosteel + POSCO) + stale |
| SupplierQuote | 5 | quotes for alternatives |
| SwitchDecisionReport | 2 | 1 active (NEGOTIATE) + 1 stale |
| WorkCheckpoint | 3 | Baseline, Shortlist, Report |
| OutcomeRecord | 0 | not yet recorded

## Feature Flags / Kill Switches

| Flag                           | Value              |
| ------------------------------ | ------------------ |
| `AI_EXECUTION_ENABLED`         | false              |
| `EXTERNAL_TOOLCALL_ENABLED`    | false              |
| `WEBHOOK_PROCESSING_ENABLED`   | false              |
| `WORKER_CONSUMING_ENABLED`     | false              |
| `BILLING_SIDE_EFFECTS_ENABLED` | false              |
| `PLUGIN_EXECUTION_ENABLED`     | false              |
| `ALLOW_DEMO_AUTH`              | false (production) |

## Migration History

| Date       | Migration                                                         | Applied By      | Status     |
| ---------- | ---------------------------------------------------------------- | --------------- | ---------- |
| 2026-05-26 | `20260526042300_add_purchase_baseline`                           | Code agent (AI) | ✅ applied |
| 2026-05-26 | `20260526050500_add_supplier_alternative`                        | Code agent (AI) | ✅ applied |
| 2026-05-26 | `20260526055700_add_switch_decision_report`                      | Code agent (AI) | ✅ applied |
| 2026-05-26 | `20260526061400_add_buyer_decision_fields`                       | Code agent (AI) | ✅ applied |
| 2026-05-26 | `20260526062600_add_outcome_record_and_checkpoint_type`          | Code agent (AI) | ✅ applied |
| 2026-05-26 | `20260526_add_buyer_decision_fields` (old name — before #85 fix) | Code agent (AI) | ❌ failed, rolled back |

## Last Smoke Test

- **Date**: 2026-05-26
- **Result**: ✅ `/api/health` 200. ✅ Auth token obtained for `pilot-owner@tradeos.local`.
- **E2E browser**: ⬜ skipped — app uses SSR cookies, needs Playwright login flow (#81 scope).

## Last Rollback Point

- **Commit hash**: `c2980e15` (#86 pilot seed)
- **Vercel deployment ID**: (record from Vercel dashboard)
- **Date**: 2026-05-26

## Residual Issues

- E2E smoke not run against staging (app uses SSR cookies, not bearer tokens — needs Playwright login flow)
- GitHub issues #70 (runtime enforcement) and #53 (tenant invariant tests) still open
- Stale seed data from retries (4 orphaned SourcingRuns) — harmless but messy
- **No production Supabase project** — Vercel prod reads/writes staging DB. See `docs/ENVIRONMENT_STRATEGY.md`.

## Auth Status

| Field | Value |
|---|---|
| Auth user | `pilot-owner@tradeos.local` ✅ |
| Auth method | Supabase Auth (email/password) |
| Confirmed | ✅ `2026-05-26T15:25:33Z` |
| Password | Set via env var, not committed |
| Bearer token | Works (password grant, 3600s expiry) |
| API test | `/api/health` 200, authenticated routes return 500 (expects SSR cookies, not bearer) |

## Next Action

1. Implement #81 behavior-driven QA scenarios / fixtures (includes Playwright login flow for real auth)
2. Then #82 NVIDIA QA Agent protocol
3. Then create production Supabase project before real buyer data

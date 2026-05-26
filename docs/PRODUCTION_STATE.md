# Production State — TradeOS Core

**Last updated**: 2026-05-26 (corrected)
**Status**: ⚠️ NO production Supabase database exists. Vercel production points to **staging DB only**. See `docs/ENVIRONMENT_STRATEGY.md` for the full environment plan.

## Current Production Commit

- `c2980e15` — feat: add pilot seed script and create pilot tenant on staging (#86)

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

## Row Counts (staging)

| Table | Count |
|---|---|
| Organization | 2 (demo-org + pilot-supplier-switch-01) |
| User | 2 (owner@tradeos.local + pilot-owner@tradeos.local) |
| SourcingRun | 0 |
| PurchaseBaseline | 0 |
| SupplierAlternative | 0 |
| SwitchDecisionReport | 0 |
| OutcomeRecord | 0 |

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
- **Result**: `/api/health` → 200 (verified pre and post migration)
- **Details**: E2E smoke not yet run (no E2E DB configured in CI; skipped by default)

## Last Rollback Point

- **Commit hash**: `6bf40cf` (#84 survival lane merge)
- **Vercel deployment ID**: (record from Vercel dashboard)
- **Date**: 2026-05-26

## Residual Issues

- No Supplier Switch case data seeded — pilot tenant has org/user but no SourcingRun, PurchaseBaseline, or SwitchDecisionReport
- No Supabase Auth user created for pilot — can only access via demo auth as `owner@tradeos.local`
- E2E smoke not run against staging (no CI DB, skipped by default)
- GitHub issues (#65, #69, #70, #53, #66) not yet closed despite PR #84 covering them
- Migration rename (#85) leaves old failed migration name in `_prisma_migrations` history
- **No production Supabase project** — Vercel production reads/writes staging DB. See `docs/ENVIRONMENT_STRATEGY.md`.

## Next Action

1. Seed pilot Supplier Switch case — SourcingRun → PurchaseBaseline → SupplierAlternative → SwitchDecisionReport
2. Create Supabase Auth user for pilot team login
3. Create production Supabase project before any real buyer data
4. Close/sync GitHub issues with PR merge state

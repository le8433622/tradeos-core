# Production State — TradeOS Core

**Last updated**: 2026-05-26
**Status**: Staging Supabase has Supplier Switch schema. Not yet production 10/10.

## Current Production Commit

- `6bf40cf` — feat: add survival lane, pilot scope, and PR template (#65, #69, #70, #53, #66) (#84)

## Vercel Deployment

- **URL**: `https://tradeos-core.vercel.app`
- **Latest deployment ID**: (record from Vercel dashboard)
- **Status**: READY (verified)
- **Health endpoint**: `/api/health` → 200

## Supabase

- **Project ref**: `ulnjnlaehfmxurreibj`
- **Current migration version**: 9 migrations applied (all Supplier Switch migrations)
- **Pending migrations**: None
- **Last backup**: (not recorded — run pg_dump or Supabase snapshot)

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

| Date       | Migration                                                         | Applied By      | Status |
| ---------- | ---------------------------------------------------------------- | --------------- | ------ |
| 2026-05-26 | `20260526042300_add_purchase_baseline`                           | Code agent (AI) | ✅     |
| 2026-05-26 | `20260526050500_add_supplier_alternative`                        | Code agent (AI) | ✅     |
| 2026-05-26 | `20260526055700_add_switch_decision_report`                      | Code agent (AI) | ✅     |
| 2026-05-26 | `20260526061400_add_buyer_decision_fields`                       | Code agent (AI) | ✅     |
| 2026-05-26 | `20260526062600_add_outcome_record_and_checkpoint_type`          | Code agent (AI) | ✅     |

## Last Smoke Test

- **Date**:
- **Result**:
- **Details**: (link to checkpoint entry or test output)

## Last Rollback Point

- **Commit hash**:
- **Vercel deployment ID**:
- **Date**:

## Residual Issues

- (list any known HIGH or CRITICAL issues that block production readiness)

## Next Action

- (what must happen before the next production operation)

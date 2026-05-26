# Production State — TradeOS Core

**Last updated**: 2026-05-27 (amended for #70, #81, #82, #90, #91, E2E auth infrastructure)
**Status**: ⚠️ NO production Supabase database exists. Vercel production points to **staging DB only**. See `docs/ENVIRONMENT_STRATEGY.md` for the full environment plan.

## Current Production Commit

- `ad93ed2` — 93+ PRs merged. #70 (runtime kill switch), #81 (behavior QA), #82 (NVIDIA QA protocol), #90 (auth user script), #91 (smoke docs update) done.

## Vercel Deployment

- **URL**: `https://tradeos-core.vercel.app`
- **Status**: READY (verified)
- **Latest deployment commit**: `ad93ed2c` — PR #91
- **Latest deployment ID**: `dpl_ADuwndvXLqueDa3av3XSfdNDgfV2`
- **Health endpoint**: `/api/health` → 200 `{"ok":true,"service":"tradeos-core-web"}`

## ⚠️ Critical: No Production DB

The Vercel production deployment (`tradeos-core.vercel.app`) currently connects to the **staging Supabase project** (TradeOS Core Staging). There is **no production Supabase project**.

This means:

- All migration, seed, and pilot operations affect the same database that Vercel production reads from
- `ALLOW_DEMO_AUTH` is currently `true` on staging (production Vercel inherits staging env vars)
- Real buyer data must NOT be stored until a production Supabase project is created

## Supabase

- **Project ref**: `ulnjanlaehfmxurreibj` (staging — NO production project)
- **Prisma migrations total**: 11 rows in `_prisma_migrations`
- **Supplier Switch applied**: 5 successful
- **Failed/rolled-back**: 2 historical
- **Pending migrations**: None

## Row Counts (staging)

| Table                | Count | Notes                                                                       |
| -------------------- | ----- | --------------------------------------------------------------------------- |
| Organization         | 3     | demo-org + pilot-supplier-switch-01 + behavior-qa-01                        |
| User                 | 3     | owner@tradeos.local + pilot-owner@tradeos.local + behavior-qa@tradeos.local |
| SourcingRun          | 16    | 1 active pilot + 11 behavior QA + 4 stale/retry                             |
| PurchaseBaseline     | 16    | 1 active pilot + 11 QA + 4 stale                                            |
| SupplierAlternative  | 18    | 12 QA + 6 stale                                                             |
| SupplierQuote        | 16    | 11 QA + 5 stale                                                             |
| SwitchDecisionReport | 13    | 1 active pilot + 1 retry + 11 QA                                            |
| WorkCheckpoint       | 6     | 3 pilot + 3 QA                                                              |
| OutcomeRecord        | 1     | `cmpn5vxyw0001cq626q6wfqtr` — NEGOTIATE, pilot case                         |

### Organization Breakdown

| Org                      | SourcingRun                 | Baseline | Alternatives | Reports | Checkpoints | Outcome |
| ------------------------ | --------------------------- | -------- | ------------ | ------- | ----------- | ------- |
| pilot-supplier-switch-01 | 5 (1 active, 4 stale/retry) | 5        | 6            | 2       | 3           | 1       |
| behavior-qa-01           | 11                          | 11       | 12           | 11      | 3           | 0       |
| demo-org                 | 0                           | 0        | 0            | 0       | 0           | 0       |

## Feature Flags / Kill Switches

| Flag                           | Value              | Runtime Enforcement                                      |
| ------------------------------ | ------------------ | -------------------------------------------------------- |
| `AI_EXECUTION_ENABLED`         | false              | ✅ `runTradeAgent()` + `planWithLlm()`                   |
| `EXTERNAL_TOOLCALL_ENABLED`    | false              | ⬜ no runtime code exists yet                            |
| `WEBHOOK_PROCESSING_ENABLED`   | false              | ✅ `processWebhookRequest()`                             |
| `WORKER_CONSUMING_ENABLED`     | false              | ✅ `runWorkerLoop()`                                     |
| `BILLING_SIDE_EFFECTS_ENABLED` | false              | ✅ `checkpoint.markAsBilled` + `billing.export` handlers |
| `PLUGIN_EXECUTION_ENABLED`     | false              | ⬜ no runtime code exists yet                            |
| `ALLOW_DEMO_AUTH`              | false (production) | n/a                                                      |

## Last Smoke Test

- **Date**: 2026-05-27
- **Result**: ✅ `pnpm typecheck` (18/18). ✅ `pnpm test` (447/447, 10 skipped). ✅ `pnpm docs:check` (60/60). ✅ `pnpm build` (53/53).
- **Behavior E2E**: ✅ 10/10 pass (with `x-demo-auth-email` cookie for org switching).
- **API health**: `/api/health` → 200.

## Auth Status

| Field              | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Demo auth override | `x-demo-auth-email` cookie supported for E2E org switching          |
| Pilot auth user    | `pilot-owner@tradeos.local` ✅                                      |
| Behavior QA user   | `behavior-qa@tradeos.local` ✅                                      |
| Permissions        | `sourcing.list`, `sourcing.view` created for `system-owner` role    |
| E2E login endpoint | `/api/e2e/login` — gated by `E2E_RUN_ENABLED=true` + non-production |
| E2E auth mode      | Supabase Auth (if `E2E_USER_PASSWORD` set) or demo auth fallback    |

## Active Canonical Pilot Case

| Field                   | Value                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Organization            | `pilot-supplier-switch-01`                                                            |
| Run title               | Steel Coil Procurement                                                                |
| Baseline                | VSC @ $620/MT                                                                         |
| Alternatives            | Baosteel $545 + POSCO $560                                                            |
| Report                  | NEGOTIATE, HIGH confidence, $450K/yr savings                                          |
| Checkpoints             | 3 (DELIVERED, awaiting BILLED)                                                        |
| Outcome                 | ✅ RECORDED — NEGOTIATE (`cmpn5vxyw0001cq626q6wfqtr`)                                 |
| Status                  | Learning loop closed                                                                  |
| SourcingRun ID          | `cmpmny3xx0005cqxdjtfklyn1`                                                           |
| SwitchDecisionReport ID | `cmpmny5qc000hcqxdqt3qrwn3`                                                           |
| WorkCheckpoint IDs      | `cmpmny62r000icqxdjfi273en`, `cmpmny62r000jcqxdh3e0wcfn`, `cmpmny62r000kcqxdsxgig0mw` |
| ACTIVE flag             | ✅ Canonical — identified by latest createdAt with complete data set                  |

**Note**: The pilot org has 5 SourcingRun rows, but only 1 is active. The other 4 are retries from development. All behavior and E2E assertions must reference this canonical run.

## RLS Policy Status

| Table                | RLS Enabled | Policy | Notes                       |
| -------------------- | ----------- | ------ | --------------------------- |
| Organization         | ✅          | ✅     | Deployed with phase1 schema |
| User                 | ✅          | ✅     | Deployed with phase1 schema |
| Company              | ✅          | ✅     | Deployed with phase1 schema |
| Lead                 | ✅          | ✅     | Deployed with phase1 schema |
| Quotation            | ✅          | ✅     | Deployed with phase1 schema |
| ApprovalRequest      | ✅          | ✅     | Deployed with phase1 schema |
| WebhookEvent         | ✅          | ✅     | Deployed with phase1 schema |
| SourcingRun          | ❌          | ❌     | **MISSING** — P0 blocker    |
| PurchaseBaseline     | ❌          | ❌     | **MISSING** — P0 blocker    |
| SupplierAlternative  | ❌          | ❌     | **MISSING** — P0 blocker    |
| SupplierCandidate    | ❌          | ❌     | **MISSING** — P0 blocker    |
| SupplierQuote        | ❌          | ❌     | **MISSING** — P0 blocker    |
| SwitchDecisionReport | ❌          | ❌     | **MISSING** — P0 blocker    |
| EvidenceItem         | ❌          | ❌     | **MISSING** — P0 blocker    |
| WorkCheckpoint       | ❌          | ❌     | **MISSING** — P0 blocker    |
| OutcomeRecord        | ❌          | ❌     | **MISSING** — P0 blocker    |
| Payment              | ❌          | ❌     | **MISSING** — P0 blocker    |
| Job                  | ❌          | ❌     | **MISSING** — P0 blocker    |
| HumanHandover        | ❌          | ❌     | **MISSING** — P0 blocker    |
| AiUsageEvent         | ❌          | ❌     | **MISSING** — P0 blocker    |

Migration SQL ready at `packages/database/prisma/migrations/20260527_add_rls_policies/`.
Approach: `auth.jwt() ->> 'email'` → look up org from User table (no Auth Hook needed).
Not yet applied. Blocked until `prisma migrate deploy` or manual SQL run.

## Residual Issues

1. **No production Supabase project** — Vercel prod reads/writes staging DB. Real buyer data must not be stored.
2. **RLS policies missing on 12 Supplier Switch tables** — old tables have policies, new ones don't. P0 blocker for production safety.
3. **FK columns lack covering indexes** — `organizationId`, `sourcingRunId` etc. Migration ready at `20260527_add_fk_covering_indexes/`. Not urgent but will degrade with pilot growth.
4. **OutcomeRecord exists** — `cmpn5vxyw0001cq626q6wfqtr` (NEGOTIATE). Learning loop closed for pilot case.
5. **ALLOW_DEMO_AUTH contradiction** — `.env` says `false`, Vercel staging says `true`. Production must be `false`.
6. **#53** (tenant invariant tests) still open — 20 of 60+ actions tested. New tests added for checkpoint, handover, markRunReadyForReview, compareQuotes, addSupplierQuote cross-tenant validation.
7. **E2E with real Supabase Auth** — `/api/e2e/login` endpoint ready, `applyAuth` updated. `E2E_USER_PASSWORD` env var not set. Falls back to demo auth.

## Next Action

1. **Apply RLS migration** — run `prisma migrate deploy` or execute migration SQL on Supabase staging. P0.
2. **Fix ALLOW_DEMO_AUTH** — set `false` on Vercel production env vars.
3. **Create production Supabase project** before real buyer data.
4. **Continue #53** — more tenant invariant tests.
5. **Mark canonical IDs** — document ACTIVE_PILOT_SOURCING_RUN_ID, ACTIVE_REPORT_ID, STALE_RUNS.
6. **Apply FK indexes** — run `20260527_add_fk_covering_indexes` migration.
7. **Then #82 NVIDIA QA Agent** — only after RLS + tenant tests + E2E are solid.

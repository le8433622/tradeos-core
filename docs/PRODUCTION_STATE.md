# Production State — TradeOS Core

**Last updated**: 2026-05-27 (amended for password rotation, env flag plan, next steps)
**Status**: ⚠️ NO production Supabase database exists. Vercel production points to **staging DB only**. See `docs/ENVIRONMENT_STRATEGY.md` for the full environment plan.

## Current Production Commit

- `25e359d` — 94+ PRs merged. #92 (RLS/FK/E2E auth/tenant tests) merged. Commit also includes #70, #81, #82, #90, #91.

## Vercel Deployment

- **URL**: `https://tradeos-core.vercel.app`
- **Status**: READY (verified)
- **Latest deployment commit**: `25e359d` — PR #92
- **Latest deployment ID**: `dpl_9FvUbbrzecawz9MA4xtC5U3o3FnM`
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
- **Prisma migrations total**: 12 rows in `_prisma_migrations`
- **Supplier Switch applied**: 7 successful
- **Failed/rolled-back**: 5 historical (FK index had 3 retries before final success)
- **Pending migrations**: None (after `20260527_fix_search_path`)
- **Key migrations**:
  - `20260527_add_rls_policies` — RLS for 13 Supplier Switch tables ✅
  - `20260527_add_fk_covering_indexes` — 87 covering indexes ✅
  - `20260527_fix_search_path` — locked `current_user_org_id()` search_path to `public` ✅

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
- **E2E 19/19 pass** — real Supabase Auth via `/api/e2e/login`. SSR cookies set and verified.
- **Auth mode**: Supabase Auth (pilot-owner@tradeos.local). Demo auth NOT used.
- **Password**: Rotated after accidental disclosure. New password set via `pgcrypto` SQL, stored only in local `.env` (gitignored).
- **API health**: `/api/health` → 200.
- **Vercel production**: `dpl_9FvUbbrzecawz9MA4xtC5U3o3FnM` — READY.

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
| SourcingRun          | ✅          | ✅     | `tenant_sourcingrun` — `20260527_add_rls_policies` |
| PurchaseBaseline     | ✅          | ✅     | `tenant_purchasebaseline` — `20260527_add_rls_policies` |
| SupplierAlternative  | ✅          | ✅     | `tenant_supplieralternative` — `20260527_add_rls_policies` |
| SupplierCandidate    | ✅          | ✅     | `tenant_suppliercandidate` — `20260527_add_rls_policies` |
| SupplierQuote        | ✅          | ✅     | `tenant_supplierquote` — `20260527_add_rls_policies` |
| SwitchDecisionReport | ✅          | ✅     | `tenant_switchdecisionreport` — `20260527_add_rls_policies` |
| EvidenceItem         | ✅          | ✅     | `tenant_evidenceitem` — `20260527_add_rls_policies` |
| WorkCheckpoint       | ✅          | ✅     | `tenant_workcheckpoint` — `20260527_add_rls_policies` |
| OutcomeRecord        | ✅          | ✅     | `tenant_outcomerecord` — `20260527_add_rls_policies` |
| Payment              | ✅          | ✅     | `tenant_payment` — `20260527_add_rls_policies` |
| Job                  | ✅          | ✅     | `tenant_job` — `20260527_add_rls_policies` |
| HumanHandover        | ✅          | ✅     | `tenant_humanhandover` — `20260527_add_rls_policies` |
| AiUsageEvent         | ✅          | ✅     | `tenant_aiusageevent` — `20260527_add_rls_policies` |

**16 tables still lack RLS policies** (out of scope for Supplier Switch migration): IntroductionRequest, Invitation, OrganizationMember, Permission, PlanLimit, QuotationLineItem, ReportSnapshot, Role, RolePermission, WebhookIntegration, and internal tables. Issue to be created.

**Helper**: `current_user_org_id()` uses `auth.jwt() ->> 'email'` → look up org from User table. Search path locked to `public` (`20260527_fix_search_path`).

## Residual Issues

1. **No production Supabase project** — Vercel prod reads/writes staging DB. Real buyer data must not be stored.
2. ✅ **RLS policies applied** — All 13 Supplier Switch tables now have tenant isolation policies via `20260527_add_rls_policies`.
3. ✅ **FK covering indexes applied** — `20260527_add_fk_covering_indexes` applied (87 total indexes). Missing tables/columns gracefully skipped.
4. ✅ **`current_user_org_id()` search_path locked** — `20260527_fix_search_path` applied on staging.
5. **OutcomeRecord exists** — `cmpn5vxyw0001cq626q6wfqtr` (NEGOTIATE). Learning loop closed for pilot case.
6. **ALLOW_DEMO_AUTH contradiction** — `.env` says `false`, Vercel staging says `true`. Production must be `false`.
7. **#53** (tenant invariant tests) still open — 30 of 60+ actions tested. sourcing-core now 70/70.
8. **E2E with real Supabase Auth** — `/api/e2e/login` endpoint ready, `applyAuth` updated. `E2E_USER_PASSWORD` env var not set. Falls back to demo auth.
9. **10 auxiliary tables lack RLS** — IntroductionRequest, Invitation, OrganizationMember, Permission, PlanLimit, QuotationLineItem, ReportSnapshot, Role, RolePermission, WebhookIntegration. Some (Permission, Role, PlanLimit) may be system-wide. Requires separate issue.

## Next Action

1. ✅ **RLS migration applied** — All 13 Supplier Switch tables protected.
2. ✅ **FK indexes applied** — 87 covering indexes.
3. ✅ **search_path fix applied** — `current_user_org_id()` locked.
4. ✅ **E2E 19/19 pass** (real Supabase Auth). 4 behavior tests fixed.
5. ✅ **Password rotated** after disclosure. New password set via SQL + `.env` update.
6. **Fix Vercel env flags** — set `ALLOW_DEMO_AUTH=false`, `E2E_RUN_ENABLED=false` on production runtime.
7. **Open auxiliary RLS issue** — P1: IntroductionRequest, Invitation, OrganizationMember, etc.
8. **Create production Supabase project** — separate DB for real buyer data.
9. **Wire Vercel production → production DB** after project created.
10. **Then #82 NVIDIA QA Agent** — only for staging/preview, never production.

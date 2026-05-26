# TradeOS Checkpoints - Production Reality Lock Ledger

**Date**: 2026-05-27 (updated after PR #92 merge, E2E 19/19 pass, behavior test fix)
**Purpose**: keep production-readiness status aligned with live GitHub issue/PR state and prevent agents from parallelizing schema/product work.

## Current Truth

- Live GitHub PR state checked: **PR #92 merged** (`25e359d` on `main`).
- Active lane: **Supplier Switch pilot verification** (PR merged, E2E 19/19 pass).
- Current tasks: **real Supabase Auth E2E** (needs password), **fix ALLOW_DEMO_AUTH**, **create production Supabase project**.
- Issues closed: `#60`, `#65`, `#66`, `#69`, `#81`, `#82`, `#92`.
- Issues open: `#70` (runtime enforcement — code complete), `#53` (tenant invariant tests — 28 of 60+).
- Issues completed this session: `#81`, `#82`, `#70`, `#92` merged, RLS/FK/search_path migration apply, E2E 19/19 pass.
- Latest merge commit: `25e359d` — 47 files changed (RLS, FK, E2E auth, outcome seed, docs sync, #53 tests, search_path fix).

## Active Work Order

Agents must follow this order and must not choose a different issue sequence:

```txt
#70 -> RLS+Fk -> search_path fix -> docs sync -> E2E (demo auth) -> merge #92 -> real auth E2E -> fix ALLOW_DEMO_AUTH -> production Supabase -> auxiliary RLS issue -> #53 -> real pilot
```

Meaning:

1. `#70` ✅ — runtime kill switch enforcement wired at 6 entry points.
2. `#82` ✅ — NVIDIA QA Agent protocol (QA-only behavior tester).
3. `E2E auth` 🔄 — `/api/e2e/login` endpoint created, `applyAuth` uses server-side auth. Needs verification.
4. `RLS policies` ✅ — Applied to staging for all 13 Supplier Switch tables.
5. `FK indexes` ✅ — Applied to staging (87 covering indexes).
6. `search_path fix` ✅ — `current_user_org_id()` locked to `public`.
7. `Sync truth docs` ✅ — PRODUCTION_STATE.md and CHECKPOINTS.md updated.
8. `E2E (demo auth)` ✅ — 19/19 pass. 4 behavior test seed title mismatches fixed.
9. `Merge #92` ✅ — `25e359d` on `main`, Vercel production READY.
10. `Real Supabase Auth E2E` ⬜ — needs `E2E_USER_PASSWORD`.
11. `Fix ALLOW_DEMO_AUTH` ⬜ — set `false` on Vercel production.
12. Create production Supabase project before real buyer data.
13. Create issue for auxiliary RLS — IntroductionRequest, Invitation, OrganizationMember, etc.
14. Implement `#53` (tenant invariant tests) for all 60+ actions.

## Reality Lock Active-Work Policy

1. Only 1 active P0 implementation PR at a time unless explicitly approved.
2. Only 1 schema-changing PR may be open at a time.
3. No schema-changing PR may be created while another schema PR is active or unverified.
4. No new product feature issues while `#53` is open.
5. No plugin/toolcall implementation while `#70`, `#53`, or `#66` are open.
6. No new package creation until Supplier Switch paid pilot proof exists.
7. No package-boundary refactor until Supplier Switch end-to-end behavior is proven by E2E or pilot evidence.
8. No schema migration apply until the `#66` health/migration runbook is satisfied.

If a task violates the above, stop and report:

```txt
BLOCKED_SCOPE_EXPANSION
```

## Allowed Work Now

- Pilot case verification on staging.
- Smoke/E2E on pilot tenant.
- Fix truth docs, RLS policies, FK indexes, OutcomeRecord.
- E2E auth infrastructure improvements.
- No source, schema, package, plugin, or product feature expansion until pilot case is fully verified.

## Frozen Until Pilot Case Is Fully Verified

- Marketplace mechanics.
- Generic CRM/ERP expansion.
- Plugin implementation.
- External source integrations, including Zernio, Alibaba, Shopee, social APIs, scraping, and supplier crawling.
- AI auto-planning or auto-execution for production flows.
- New packages.
- Schema-heavy feature work outside the active survival issue.

## NVIDIA QA Boundary

NVIDIA API Agent is QA-only for local/test/preview/staging behavior validation. It must not write production DB, apply migrations, modify source, create commits, open/merge PRs, run production runtime, call real billing side effects, send real outbound messages, approve business actions, or replace pilot validation.

Hard assertions remain deterministic E2E/CI responsibilities. NVIDIA QA reports behavior/product-risk findings.

## Verification Policy

For current pilot verification (pilot tenant `pilot-supplier-switch-01`):

```txt
pnpm typecheck
pnpm test
pnpm docs:check
pnpm build
```

For behavior QA verification:

```txt
pnpm test
E2E_RUN_ENABLED=true pnpm --filter @tradeos/web test:e2e -- apps/web/e2e/behavior.spec.ts
```

All checks PASSED on 2026-05-27:

| Check                    | Result                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`         | ✅ 18/18 — 0 errors                                                                                   |
| `pnpm test`              | ✅ 447/447 pass (10 skipped integration)                                                              |
| `pnpm build`             | ✅ 53/53 pages                                                                                        |
| `pnpm docs:check`        | ✅ 60/60 actions                                                                                      |
| `/api/health`            | ✅ 200                                                                                                |
| Pilot SourcingRun        | ✅ Steel Coil Procurement (DRAFT)                                                                     |
| Pilot Baseline           | ✅ VSC @ $620/MT                                                                                      |
| Pilot Alternatives       | ✅ Baosteel $545 + POSCO $560                                                                         |
| Pilot Quotes             | ✅ 2 quotes                                                                                           |
| Pilot Report             | ✅ NEGOTIATE, HIGH confidence, $450K/yr savings                                                       |
| Pilot Checkpoints        | ✅ 3 delivered                                                                                        |
| Pilot OutcomeRecord      | ✅ RECORDED — NEGOTIATE (`cmpn5vxyw0001cq626q6wfqtr`). Learning loop closed.                          |
| Pilot Auth user          | ✅ pilot-owner@tradeos.local (Supabase Auth, confirmed)                                               |
| Behavior QA catalog      | ✅ `docs/34_BEHAVIOR_QA_CATALOG.md` — 15 scenarios documented                                         |
| Behavior fixtures seed   | ✅ 11 messy scenarios seeded to staging (`behavior-qa-01`)                                            |
| Behavior E2E             | ✅ 19/19 pass (demo auth). 4 seed title mismatches fixed.                                            |
| Behavior permissions     | ✅ `sourcing.list`, `sourcing.view` added to `system-owner` role                                      |
| NVIDIA QA protocol       | ✅ `docs/35_NVIDIA_QA_AGENT_PROTOCOL.md` — role, boundaries, env rules, report format, severity model |
| Kill switch runtime      | ✅ `@tradeos/policy-core/src/kill-switch.ts` — 6 kill switches, 6 wired entry points in 4 packages    |
| E2E auth infrastructure  | ✅ `/api/e2e/login` endpoint + `applyAuth()` using server-side auth                                   |
| E2E test conversion      | ✅ All 4 spec files use `applyAuth()` from `auth/fixtures.ts`                                         |
| Tenant invariant tests   | ✅ 8 new tests (sourcing-core 70/70 pass). checkpoint, handover, sourcing actions.                     |
| Canonical IDs documented | ✅ `docs/PRODUCTION_STATE.md` — all UUIDs recorded                                                    |
| Truth docs synced        | ✅ PRODUCTION_STATE.md and CHECKPOINTS.md updated to current state                                    |
| RLS migration applied    | ✅ `20260527_add_rls_policies` — 13 policies + helper `current_user_org_id()`                          |
| FK indexes applied       | ✅ `20260527_add_fk_covering_indexes` — 87 covering indexes (DO blocks for graceful skip)             |
| search_path fix applied  | ✅ `20260527_fix_search_path` — `current_user_org_id()` locked to `public`                             |
| GitHub PR up to date     | ✅ PR #92 branch `rls-supplier-switch-policies` pushed (3 commits on top of base)                     |

## Residual Risks

- No production Supabase DB — Vercel prod points to staging. Real buyer data must not be stored.
- ✅ RLS policies applied for Supplier Switch tables. 10 auxiliary tables still lack RLS (IntroductionRequest, Invitation, OrganizationMember, Permission, PlanLimit, QuotationLineItem, ReportSnapshot, Role, RolePermission, WebhookIntegration).
- ✅ FK covering indexes applied (87 total). Missing tables/columns gracefully skipped.
- E2E real auth requires `E2E_USER_PASSWORD` env var (password from PR #90). Without it, tests fall back to demo auth.
- Kill switches default to `false` in production — all automation paths blocked until explicitly enabled.
- #53 CI gates added but E2E/schema/tenant checks are conditional — inactive without env vars.
- Stale seed data on staging DB (4 orphaned SourcingRuns).
- ALLOW_DEMO_AUTH contradiction: local `.env` says `false`, Vercel staging says `true`.
- OutcomeRecord = 1 in staging — `cmpn5vxyw0001cq626q6wfqtr`. Learning loop closed for pilot.
- `current_user_org_id()` search_path fixed — warning cleared from Supabase Security Advisor.

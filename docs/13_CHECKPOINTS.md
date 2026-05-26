# TradeOS Checkpoints - Production Reality Lock Ledger

**Date**: 2026-05-26
**Purpose**: keep production-readiness status aligned with live GitHub issue/PR state and prevent agents from parallelizing schema/product work.

## Current Truth

- Live GitHub PR state checked: **no open PRs**.
- Active lane: **Supplier Switch pilot verification**.
- Current task: **#70** — runtime kill switch enforcement (✅ code done, plan docs updated). Next: close #70, then production Supabase project.
- Issues closed: `#60`, `#65`, `#66`, `#69`, `#81`, `#82`.
- Issues open: `#70` (runtime enforcement — code complete), `#53` (tenant invariant tests).
- Issues completed this session: `#81` (behavior QA), `#82` (NVIDIA QA agent protocol), `#70` (runtime kill switch enforcement).
- All 93+ PRs merged. Main at `ad93ed2`.
- Older docs are historical unless they match live GitHub state and `docs/CURRENT_TRUTH.md`.

## Active Work Order

Agents must follow this order and must not choose a different issue sequence:

```txt
#70 (done) -> production Supabase project -> #53 -> real buyer pilot
```

Meaning:

1. `#70` ✅ — runtime kill switch enforcement wired at 6 entry points.
2. `#82` ✅ — NVIDIA QA Agent protocol (QA-only behavior tester).
3. Create production Supabase project before real buyer data.
4. Implement `#53` (tenant invariant tests).

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
- Behavior QA documentation (#81) and NVIDIA QA protocol (#82).
- No source, schema, package, plugin, or product feature expansion until pilot case is fully verified.

## Frozen Until Pilot Case Is Fully Verified

- Marketplace mechanics.
- Generic CRM/ERP expansion.
- Plugin implementation.
- External source integrations, including Zernio, Alibaba, Shopee, social APIs, scraping, and supplier crawling.
- AI auto-planning or auto-execution for production flows.
- New packages.
- Schema-heavy feature work outside the active survival issue.

## Production State Truth Needed

`docs/PRODUCTION_STATE.md` should be created by the appropriate issue (`#66` or explicit production-state task), not by ad-hoc agent choice. Minimum fields when created:

- current production commit;
- current Vercel deployment URL/ID;
- current Supabase migration version;
- feature flags and kill switches;
- pending migrations;
- last smoke test result;
- last rollback point.

Do not infer production state from memory or local green tests.

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
pnpm docs:check
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
| Pilot OutcomeRecord      | ✅ RECORDED — NEGOTIATE (cmpn5vxyw0001cq626q6wfqtr)                                                   |
| Pilot Auth user          | ✅ pilot-owner@tradeos.local (Supabase Auth, confirmed)                                               |
| Behavior QA catalog      | ✅ `docs/34_BEHAVIOR_QA_CATALOG.md` — 15 scenarios documented                                         |
| Behavior fixtures seed   | ✅ 11 messy scenarios seeded to staging (`behavior-qa-01`)                                            |
| Behavior E2E             | ✅ 10/10 pass (cookie-based demo auth org override)                                                   |
| Behavior permissions     | ✅ `sourcing.list`, `sourcing.view` added to `system-owner` role                                      |
| NVIDIA QA protocol       | ✅ `docs/35_NVIDIA_QA_AGENT_PROTOCOL.md` — role, boundaries, env rules, report format, severity model |
| Ruler update             | ✅ Stop condition #22 (QA agent writing code), file boundaries, active sequence                       |
| Testing strategy         | ✅ NVIDIA QA Agent section added                                                                      |
| `.env.example`           | ✅ `NVIDIA_QA_*` env vars added                                                                       |
| Kill switch runtime      | ✅ `@tradeos/policy-core/src/kill-switch.ts` — 6 kill switches, 6 wired entry points in 4 packages    |
| E2E auth infrastructure  | ✅ `apps/web/e2e/auth/supabase-auth.ts` — real Supabase Auth or demo fallback                         |
| E2E test conversion      | ✅ All 4 spec files use `applyAuth()` from `auth/fixtures.ts`                                         |
| Tenant invariant tests   | ✅ 2 new tests for `createPurchaseBaseline` + `addSupplierAlternative`. sourcing-core 62/62 pass.     |
| Canonical IDs documented | ✅ `docs/PRODUCTION_STATE.md` — all UUIDs recorded                                                    |

## Residual Risks

- No production Supabase DB — Vercel prod points to staging. Real buyer data must not be stored.
- E2E real auth requires `E2E_USER_PASSWORD` env var (password from PR #90). Without it, tests fall back to demo auth.
- Kill switches default to `false` in production — all automation paths blocked until explicitly enabled.
- #53 CI gates added but E2E/schema/tenant checks are conditional — inactive without env vars.
- Stale seed data on staging DB (4 orphaned SourcingRuns).
- All changes since last update are NOT committed — #70, E2E auth, and outcome scripts are pending commit.

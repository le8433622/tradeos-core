# TradeOS Checkpoints - Production Reality Lock Ledger

**Date**: 2026-05-26
**Purpose**: keep production-readiness status aligned with live GitHub issue/PR state and prevent agents from parallelizing schema/product work.

## Current Truth

- Live GitHub PR state checked: **no open PRs**.
- Active lane: **Supplier Switch pilot verification**.
- Issues closed: `#60`, `#65`, `#66`, `#69`.
- Issues open (residual scope): `#70` (runtime enforcement), `#53` (tenant invariant tests).
- All 87 PRs merged. Main at `e97d11c`.
- Older docs are historical unless they match live GitHub state and `docs/CURRENT_TRUTH.md`.

## Active Work Order

Agents must follow this order and must not choose a different issue sequence:

```txt
#65 -> #69 -> #70 -> #53 -> #66 -> #60/status-confirmation
```

Meaning:

1. `#65` - enforce Reality Lock active-work limit and stop parallel schema expansion.
2. `#69` - add production change-class gate and PR template enforcement.
3. `#70` - add AI/toolcall kill switch and manual-first enforcement.
4. `#53` - add conditional E2E, schema-change, and tenant invariant CI gates.
5. `#66` - add production health gate and migration apply runbook before Supabase schema changes.
6. `#60` - closed; only confirm status or address a proven regression.

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
pnpm docs:check
Programmatic chain verification: SourcingRun → Baseline → Alts → Report → Checkpoints
Health: /api/health → 200
```

All checks PASSED on 2026-05-26:

| Check | Result |
|---|---|
| `/api/health` | ✅ 200 |
| SourcingRun | ✅ Steel Coil Procurement (DRAFT) |
| Baseline | ✅ VSC @ $620/MT |
| Alternatives | ✅ Baosteel $545 + POSCO $560 |
| Quotes | ✅ 2 quotes |
| Report | ✅ NEGOTIATE, HIGH confidence, $450K/yr savings |
| Checkpoints | ✅ 3 delivered |
| OutcomeRecord | ⬜ not recorded (buyer decision pending) |
| Auth user | ✅ pilot-owner@tradeos.local (Supabase Auth, confirmed) |
| E2E browser | ⬜ skipped — needs Playwright login flow (#81) |

## Residual Risks

- No production Supabase DB — Vercel prod points to staging. Real buyer data must not be stored.
- No Supabase Auth user for pilot tenant — E2E browser tests can't authenticate as pilot user.
- #70 (kill switch) docs done, runtime enforcement not implemented.
- #53 CI gates added but E2E/schema/tenant checks are conditional — inactive without env vars.
- Stale seed data from failed attempts (4 orphaned SourcingRuns) on staging DB.
- All changes since `#65`–`#87` are committed/merged. No uncommitted work.

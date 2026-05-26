# TradeOS Checkpoints - Production Reality Lock Ledger

**Date**: 2026-05-26
**Purpose**: keep production-readiness status aligned with live GitHub issue/PR state and prevent agents from parallelizing schema/product work.

## Current Truth

- Live GitHub PR state checked: **no open PRs**.
- Active issue: `#66` — production health gate and migration apply runbook.
- Live open survival issues: `#65`, `#69`, `#70`, `#53`, `#66`.
- `#60` is closed in live GitHub state; do not reopen unless a new regression issue or failing test proves it is broken.
- Older Supplier Switch and checkpoint text is historical unless it matches live GitHub state and `docs/CURRENT_TRUTH.md`.

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

- Docs/policy enforcement for `#66` — production health gate, migration apply runbook.
- Preparatory verification that does not mutate production data or schema.
- No source, schema, package, plugin, or product feature expansion for `#66`.

## Frozen Until Survival Gates Are Green

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

For `#65` (`DOCS_ONLY`):

```txt
pnpm docs:check
pnpm routes:check if action docs touched
```

For `#66` (`DOCS_ONLY`):

```txt
pnpm docs:check
```

For later change classes, use the change-class gates in `docs/CURRENT_TRUTH.md`, `RULES.md`, and the relevant issue body.

## Residual Risks

- This file records policy and sequencing only. It is not CI enforcement.
- `#69` must convert change-class declarations into PR template/enforcement.
- `#70` must add kill-switch/manual-first enforcement.
- `#53` must add CI gates for E2E/schema/tenant invariants.
- `#66` documentation is complete locally (migration apply runbook, health gate, production state). Not yet committed/merged. No migrations have been applied.
- All changes since `#65`–`#53` are uncommitted; no safety gates are active in CI until the commits land on `main`.

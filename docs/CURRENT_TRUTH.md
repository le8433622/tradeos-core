# CURRENT TRUTH - TradeOS

**Date**: 2026-05-26
**Purpose**: single active-work source of truth for code agents before doing more work.

## Live State Check

- Live GitHub PR state checked: **no open PRs**.
- Current active issue: `#65` - P0 Reality Lock active-work limit.
- `#60` is **closed** in live GitHub state. Do not reopen it unless a new failing test or issue proves regression.
- Stale docs do not override live GitHub issue/PR state.

## Reality Lock Active-Work Policy

TradeOS is no longer in architecture-expansion mode. Every change must serve one of:

1. Production safety.
2. Behavior QA / E2E confidence.
3. Supplier Switch pilot validation.

If a task does not serve one of those, defer it.

## Active Issue Order

Agents must not choose issue order. Use this order unless the human explicitly changes it:

```txt
#65 -> #69 -> #70 -> #53 -> #66 -> #60/status-confirmation
```

Interpretation:

- `#65` - enforce Reality Lock active-work limit and stop parallel schema expansion.
- `#69` - add production change-class gate and PR template enforcement.
- `#70` - add AI/toolcall kill switch and manual-first enforcement.
- `#53` - add conditional E2E, schema-change, and tenant invariant CI gates.
- `#66` - add production health gate and migration apply runbook before Supabase schema changes.
- `#60` - already closed; only confirm status or fix a proven regression.

## Hard Active-Work Limits

1. Only one active P0 implementation PR at a time unless explicitly approved.
2. Only one schema-changing PR may be open at a time.
3. No new schema-changing PR while another schema PR is open or unverified.
4. No new product feature issues while `#53` is open.
5. No plugin/toolcall product implementation before `#70`, `#53`, and `#66` are complete and pilot proof exists.
6. No new package creation until Supplier Switch paid pilot proof exists.
7. No package-boundary refactor until Supplier Switch end-to-end behavior is proven by E2E or pilot evidence.
8. No schema migration apply until production health and migration runbook gates are satisfied by `#66`.

If a requested task violates these limits, stop and report:

```txt
BLOCKED_SCOPE_EXPANSION
```

## Production Change Classes

Every PR must declare one primary change class and any secondary class:

```txt
DOCS_ONLY
TEST_ONLY
SCHEMA_CHANGE
RUNTIME_CHANGE
WORKER_CHANGE
AUTH_POLICY_CHANGE
APPROVAL_BILLING_CHANGE
AI_TOOLCALL_CHANGE
PRODUCTION_OPERATION
```

`#65` is `DOCS_ONLY`.

## Current Freeze

Frozen until the survival gates are complete:

- marketplace mechanics;
- generic CRM/ERP expansion;
- plugin implementation;
- external source integrations, including Zernio, Alibaba, Shopee, social APIs, scraping, and supplier crawling;
- AI auto-planning or auto-execution for production flows;
- new packages;
- schema-heavy feature work not directly tied to the active survival issue.

## Supplier Switch Manual Flow

Supplier Switch remains manual-first:

```txt
create sourcing run
-> create baseline manually
-> add alternatives manually
-> generate deterministic report
-> buyer decision
-> checkpoint
-> outcome
```

AI may assist with extraction, summarization, missing-proof suggestions, draft text, and QA behavior testing only. AI must not make final economic decisions, auto-switch suppliers, auto-bill, auto-approve, or write production data.

## NVIDIA QA Boundary

NVIDIA API Agent is QA-only in local/test/preview/staging. It must not write production DB, apply migrations, modify source code, create commits, open/merge PRs, run production runtime, send real outbound messages, or approve real business actions.

OpenCode builds. NVIDIA QA tests behavior. CI verifies code. Human approves merge/deploy.

## Unlock Conditions

Before plugin/toolcall/product expansion:

1. `#65`, `#69`, `#70`, `#53`, and `#66` must be complete.
2. Any closed `#60` behavior must remain verified or have a fresh regression issue.
3. Migration apply proof must exist before online schema changes.
4. Supplier Switch paid pilot proof must exist.
5. Pilot proof ledger must show commercial validation, operator time, evidence quality, buyer decision, and outcome follow-up status.

## Agent Stop Conditions

Stop before editing if:

- the requested work is out of the active issue order;
- it creates a new package;
- it opens schema work while a schema PR is active;
- it implements plugin/toolcall product behavior;
- it uses AI/NVIDIA QA as a production agent;
- it requires production ops without explicit human approval for each command;
- it treats docs as proof instead of CI/E2E/manual evidence.

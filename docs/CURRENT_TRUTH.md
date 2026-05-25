# CURRENT TRUTH — TradeOS

**Date**: 2026-05-25
**Purpose**: single source of truth for AI/code agents before doing any more work.

## Current GitHub State

- Open PRs: **none**.
- Open issues:
  - `#10` — Authenticated Vercel staging smoke.
  - `#12` — Authenticated E2E suite.
- Recently closed PRs:
  - `#21` — MoneyOS evidence/billing/API errors/billing UI micro-task round.
  - `#22` — AI procurement safety and blocked-action sync.
- Closed/completed issues include:
  - `#4`, `#5`, `#6`, `#7`, `#11`, `#13`, `#14`, `#15`, `#16`, `#17`, `#18`, `#19`.

## Non-Negotiable Agent Rules

1. Do **not** reopen or rework closed issues unless a failing test or fresh GitHub issue proves regression.
2. Do **not** treat stale checkpoint text as more authoritative than the live GitHub issue/PR state.
3. Do **not** add new product features while the remaining work is proof/ops/E2E.
4. Do **not** fake authenticated staging proof.
5. If staging credentials, Supabase auth user, Vercel preview URL, or E2E env vars are unavailable, stop and mark the task as environment-blocked.

## Remaining Work Classification

### `#10` — Ops/manual proof task

This requires real staging/Vercel/Supabase access and authenticated browser/API evidence. It cannot be completed by code changes alone.

Required stop condition:

```txt
If authenticated staging access is unavailable, do not code around it. Record missing environment proof and stop.
```

### `#12` — E2E harness/proof task

This may require Playwright/test infrastructure plus test auth credentials. A skeleton can be added, but complete proof requires environment configuration.

Required stop condition:

```txt
If E2E env vars or auth bootstrap are unavailable, tests must skip/fail clearly with actionable messaging. Do not loop on product code.
```

## Current Product Direction

TradeOS is not a generic SaaS, CRM, ERP, marketplace, or chatbot.

TradeOS is an AI case execution operating system for economic/supply-chain decisions:

```txt
Human pain
→ Economic Case
→ Tool/action execution
→ Evidence
→ Risk-adjusted decision
→ Human approval
→ Checkpoint billing
→ Outcome learning
```

## Definition of Done For Current Loop

The current loop is done when:

1. `docs/13_CHECKPOINTS.md` reflects that only `#10` and `#12` are open.
2. Closed issues are no longer listed as open blockers.
3. Environment-blocked proof tasks are explicitly separated from code tasks.
4. No unrelated source-code changes are introduced.

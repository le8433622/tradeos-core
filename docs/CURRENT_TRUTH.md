# CURRENT TRUTH — TradeOS

**Date**: 2026-05-25
**Purpose**: single source of truth for AI/code agents before doing any more work.

## Current GitHub State

- Open PRs: **none**.
- Latest `main` commit: `2fb53ab` (`docs: add current truth and super agent ruler`).
- Latest `main` CI: pass — GitHub Actions run `26404292875` for `2fb53ab`.
- Recently merged PRs:
  - `#23` — docs: add `CURRENT_TRUTH`, checkpoint rewrite, `SUPER_AGENT_RULER`.
  - `#24` — incident recovery: restore middleware pattern, add anti-loop protocol, update runbook.
  - `#22` — AI procurement safety and blocked-action sync.
  - `#21` — MoneyOS evidence/billing/API errors/billing UI micro-task round.
- Open issues:
  - `#25` — P0: rebuild current truth after incident recovery and prevent stale-state regression.
  - `#26` — P0: run authenticated production/staging smoke after incident restore.
  - `#27` — P1: add authenticated E2E harness with environment-blocked stop behavior.
  - `#28` — P1: define Supplier Switch Intelligence product spec without coding features.
  - `#29` — P2: design plugin intake layer for social pain, supplier sources, quote parsing, and evidence.
- Closed/deferred issues:
  - `#10` — closed as not planned; replaced by focused incident-smoke issue `#26`.
  - `#12` — closed as not planned; replaced by focused E2E-harness issue `#27`.
- Closed/completed issues include:
  - `#4`, `#5`, `#6`, `#7`, `#11`, `#13`, `#14`, `#15`, `#16`, `#17`, `#18`, `#19`.

## Current Mode

The repo is in **incident-proof / state-sync mode** until `#25` and `#26` are resolved.

Allowed now:

1. Update docs to match live GitHub and deployment truth (`#25`).
2. Run or record production/staging smoke evidence (`#26`).
3. Add E2E harness with explicit env-blocked behavior (`#27`) only after the immediate incident-proof docs are synced.
4. Write product/spec docs for `#28` and `#29` without source-code implementation.

Not allowed now:

1. Claim production readiness.
2. Fake authenticated smoke proof.
3. Patch middleware/auth around missing or invalid environment variables.
4. Add marketplace/CRM/ERP/social/product features outside the open issues.

## Production Availability Truth

Production health is **not yet proven healthy** after the incident merge.

Observed evidence from this session:

```txt
curl https://tradeos-core.vercel.app/api/health
→ 500 MIDDLEWARE_INVOCATION_FAILED
```

Likely root class: Vercel/Supabase Production environment configuration, especially `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are encrypted in Vercel and were not readable from this agent session.

This is an ops/environment blocker, not a reason to keep patching middleware blindly.

## Non-Negotiable Agent Rules

1. Live GitHub issue/PR state wins over stale docs.
2. Do **not** reopen or rework closed issues unless a failing test or fresh GitHub issue proves regression.
3. Do **not** treat missing or invalid env/auth/deployment access as a product-code bug.
4. Do **not** fake authenticated staging/production proof.
5. If Vercel/Supabase/env access is unavailable, record the blocker and stop.
6. Product expansion is frozen until production proof is either restored or intentionally separated into spec-only docs.

## Remaining Work Classification

### `#25` — Documentation synchronization task

This issue is complete only when:

1. `docs/CURRENT_TRUTH.md` reflects live GitHub state.
2. `docs/13_CHECKPOINTS.md` no longer contradicts live issue/PR state.
3. `docs/SUPER_AGENT_RULER.md` no longer says `#10/#12` are the only open issues.
4. No product/source files are changed.

### `#26` — Ops/manual proof task

This requires real deployed environment access and authenticated browser/API evidence. It cannot be completed by code changes alone.

Required stop condition:

```txt
If authenticated staging/production access, valid Supabase env vars, or Vercel runtime proof are unavailable, do not code around it. Record missing environment proof and stop.
```

### `#27` — E2E harness/proof task

This may require Playwright/test infrastructure plus test auth credentials. Missing env must produce clear skip/fail behavior, not fake proof.

### `#28` — Product/spec task

Spec-only Supplier Switch Intelligence direction. No source-code changes or migrations.

### `#29` — Product/spec task

Spec-only plugin intake architecture. No source-code integrations.

## Definition Of Done For Current Loop

The current loop is done when:

1. GitHub state has been checked live.
2. `docs/CURRENT_TRUTH.md`, `docs/13_CHECKPOINTS.md`, and `docs/SUPER_AGENT_RULER.md` match that state.
3. Production availability is honestly marked as unproven/blocked until `#26` succeeds.
4. No unrelated source-code changes are introduced.
5. `pnpm docs:check` passes.

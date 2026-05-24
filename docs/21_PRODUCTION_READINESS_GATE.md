# Production Readiness Gate

## Rule

TradeOS production readiness cannot be claimed unless every required gate below has real evidence. Local success is necessary but not sufficient. Staging migration, Vercel preview smoke, route/action parity, CI proof, and rollback paths must all be recorded.

## Gate Summary

| Gate                | Required Evidence                                                                                             | Status |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| Local typecheck     | `pnpm typecheck` pass                                                                                         | TODO   |
| Local tests         | `pnpm test` pass                                                                                              | TODO   |
| Local build         | `pnpm build` pass                                                                                             | TODO   |
| Lint                | `pnpm lint` pass                                                                                              | TODO   |
| Docs parity         | `pnpm docs:check` pass, including action metadata parity                                                      | TODO   |
| License compliance  | `pnpm license:check` pass                                                                                     | TODO   |
| Whitespace          | `git diff --check` pass                                                                                       | TODO   |
| Route/action parity | `pnpm routes:check` pass                                                                                      | TODO   |
| Integration tests   | `RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test` pass against real staging/local DB | TODO   |
| Staging migration   | Supabase staging migration tested with existing data and verification SQL recorded                            | TODO   |
| Vercel preview      | Preview deployment URL recorded and smoke checklist completed                                                 | TODO   |
| Demo auth           | `ALLOW_DEMO_AUTH=false` verified for production-like environment                                              | TODO   |
| Branch protection   | Main branch requires CI status checks and review                                                              | TODO   |
| Rollback path       | Feature/env/deploy rollback documented for touched risk areas                                                 | TODO   |

## Required Commands

```bash
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
pnpm lint
pnpm license:check
git diff --check
```

This command is also required:

```bash
pnpm routes:check
```

Before production readiness, this DB-backed check is required against staging or an equivalent real database:

```bash
RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test
```

## Functional Gates

| Area                  | Required Proof                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Tenant isolation      | Every tenant-scoped query in touched paths includes `organizationId` or a documented cross-tenant authorization rule                       |
| Permission gates      | Protected API routes use `withApiPermission` or `withApiSession`; mutations preflight permissions before writes                            |
| Auditability          | Every meaningful mutation writes audit through `executeAction` or an explicit documented infrastructure audit path                         |
| MFA/approval          | HIGH/CRITICAL and always-MFA actions block unsafe execution and record audit evidence                                                      |
| Input validation      | API routes and action handlers parse inputs with Zod or documented type-safe parsing                                                       |
| Route/action parity   | API route action literals must exist in the registered action registry                                                                     |
| Webhook safety        | Signed valid payload succeeds, unsigned payload rejects, duplicate does not duplicate inbox/effects, agent failure is not marked PROCESSED |
| Settings safety       | Settings PATCH uses registered actions, no direct settings DB mutation, and returns current state                                          |
| Quotation correctness | Quotation line items persist and totals derive from stored items when present                                                              |
| Billing correctness   | Seat count uses ACTIVE `OrganizationMember` rows, not legacy `User.organizationId`                                                         |

## Environment Gates

| Environment Item | Requirement                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Supabase auth    | Supabase public and server publishable keys are set per environment                               |
| Database URLs    | `DATABASE_URL` and `DIRECT_URL` point to the intended environment only                            |
| Demo auth        | `ALLOW_DEMO_AUTH=false` in production and staging smoke unless explicitly testing local demo mode |
| Webhook secrets  | `WEBHOOK_SECRET` or provider-specific secrets set; `WEBHOOK_ENCRYPTION_KEY` set                   |
| Health checks    | `HEALTHCHECK_SECRET` set for deep health in production-like environments                          |
| App URL          | `APP_URL` matches the target deployment URL                                                       |

## Issue #1 Completion Gate

GitHub issue #1 is not complete until all of these are true:

1. T0.001 through T0.006 are fixed and verified.
2. Route/action parity check exists, has a root script, and runs in CI.
3. Settings PATCH and quotation line items have regression coverage or documented DB-backed manual verification.
4. Staging migration with existing data is recorded.
5. Vercel preview smoke is recorded in `docs/20_STAGING_SMOKE_TESTS.md` or `docs/13_CHECKPOINTS.md`.
6. Procurement/MoneyOS schema and action work is not started before P0/P1 verification is green.
7. `docs/13_CHECKPOINTS.md` lists passed, skipped, and remaining risks honestly.

## Evidence Record Template

```markdown
## Production Readiness Gate Evidence

Date:
Commit SHA:
Target environment:
Operator:

Local Checks:

- pnpm db:generate:
- pnpm typecheck:
- pnpm test:
- pnpm build:
- pnpm docs:check:
- pnpm lint:
- pnpm license:check:
- git diff --check:
- pnpm routes:check:

Staging Checks:

- Integration tests:
- Migration verification:
- Vercel preview URL:
- Smoke checklist:

Production Controls:

- Demo auth disabled:
- Branch protection:
- Rollback path:

Decision:

- Ready / Not ready:
- Blocking risks:
```

## Stop Rule

If any HIGH or CRITICAL issue remains in a touched path, the gate fails. Do not use the terms "done", "production-ready", or "10/10" until the blocker is fixed or explicitly documented with severity, file, reason, and next fix.

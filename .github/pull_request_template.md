## Change Class

<!-- REQUIRED: declare ONE primary class. Optionally add secondary classes. -->

Primary: <!-- DOCS_ONLY | TEST_ONLY | SCHEMA_CHANGE | RUNTIME_CHANGE | WORKER_CHANGE | AUTH_POLICY_CHANGE | APPROVAL_BILLING_CHANGE | AI_TOOLCALL_CHANGE | PRODUCTION_OPERATION -->

Secondary (if any): <!-- optional -->

## Gate Checklist

<!-- Check the gates that apply to your primary class. Leave others unchecked. -->

### DOCS_ONLY

- [ ] `pnpm docs:check`

### SCHEMA_CHANGE

- [ ] `pnpm db:generate`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Migration SQL reviewed (attach SQL or link)
- [ ] No `prisma db push` used
- [ ] Production health gate satisfied (`#66`)
- [ ] Migration apply runbook ready for online apply

### AUTH_POLICY_CHANGE

- [ ] Tenant invariant tests added or verified
- [ ] Cross-tenant deny tests added or verified
- [ ] `pnpm routes:check`
- [ ] No unscoped Prisma query introduced

### WORKER_CHANGE

- [ ] Timeout, retry, and DLQ config documented
- [ ] Queue class impact documented
- [ ] No unbounded AI/toolcall loop

### APPROVAL_BILLING_CHANGE

- [ ] Idempotency proven (test or design note)
- [ ] Stale recovery proven
- [ ] Immutable audit/evidence event proven
- [ ] Evidence-before-billing proven

### AI_TOOLCALL_CHANGE

- [ ] Kill switch present
- [ ] Budget cap present
- [ ] Max retry/toolcall limit present
- [ ] Human takeover boundary present

### PRODUCTION_OPERATION

- [ ] Rollback path documented
- [ ] Pre-operation verification steps listed
- [ ] Post-operation verification steps listed

## What Changed

<!-- Brief: what files changed and why. -->

## What Was Not Changed

<!-- Explicitly state what was NOT changed. Prevents scope creep. -->

## Verification

### Commands Run

```
# Paste exact commands and output
```

### Commands Skipped

<!-- For each skipped command, state the reason. -->

| Command | Reason |
| ------- | ------ |
|         |        |

## Risk Review

| Category        | Level (Low/Med/High/Crit) | Notes |
| --------------- | ------------------------- | ----- |
| Technical risk  |                           |       |
| Business risk   |                           |       |
| Tenant risk     |                           |       |
| Migration risk  |                           |       |
| Production risk |                           |       |

## Residual Risks

<!-- What risks remain after this change? Be honest. -->

## Next Required Step

<!-- What issue or action must come after this PR? -->

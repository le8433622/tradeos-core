# ADR 0002: AI Actions Must Be Policy-Gated

## Status

Accepted

## Context

TradeOS uses AI to triage messages, extract trade data, draft quotations, and suggest actions. International trade workflows involve commercial risk, customer commitments, private tenant data, and potential legal/financial impact.

Allowing AI to write directly to the database or execute external actions without control would weaken trust and make auditability impossible.

## Decision

AI must never write directly to the database. AI may only execute by producing a plan and calling registered actions through `@tradeos/policy-core`.

High-risk AI-planned actions must become approval requests before execution.

## Consequences

Positive:

- clear safety boundary
- auditable automation
- role-aware execution
- approval-gated risky actions
- easier testing of AI behavior

Negative:

- more implementation ceremony
- direct AI automation is slower
- action registry must stay maintained

## Required Implementation Pattern

```txt
AI input
-> AgentPlan
-> safe registered action executes through policy
-> risky registered action becomes ApprovalRequest
-> approved request executes through policy with approved=true
-> audit log records outcome
```

## Blocked Patterns

```txt
AI -> Prisma
AI -> external send without approval
AI -> cross-tenant query
AI -> permission or payment mutation
```

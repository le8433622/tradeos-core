# Architecture Decision Records

Cross-cutting decisions that affect package boundaries, security posture, or deployment topology.

## Process

1. Before implementing a cross-cutting change, create an ADR.
2. ADRs are living documents — update status when decisions change.
3. Required reviewer roles per risk area:

| Risk Area                       | Required Reviewer |
| ------------------------------- | ----------------- |
| Database schema change          | CTO, CISO         |
| Auth / tenant isolation change  | CISO              |
| AI prompt / model change        | CTO, CCO          |
| Deployment / infra change       | CTO               |
| Data privacy / retention change | CISO              |
| Public API contract change      | CTO, CCO          |

## ADR List

| ID  | Title                                       | Status   | Date    |
| --- | ------------------------------------------- | -------- | ------- |
| 001 | Action Registry as Source of Truth for Risk | Accepted | 2025-03 |
| 002 | Prompt Injection Gate Before LLM Call       | Accepted | 2025-03 |
| 003 | Tenant Isolation via organizationId         | Accepted | 2025-03 |
| 004 | Async Webhook Processing with Sync Fallback | Accepted | 2025-04 |
| 005 | Audit Log Immutability                      | Accepted | 2025-04 |
| 006 | Registered Actions for All Mutations        | Accepted | 2025-04 |
| 007 | Report Snapshots DRAFT→APPROVED→DISTRIBUTED | Accepted | 2025-05 |
| 008 | PII Anonymization via Registered Action     | Accepted | 2025-05 |
| 009 | Plan Limits as Config, Not DB               | Accepted | 2025-05 |
| 010 | Eval Harness for AI Quality Gate            | Accepted | 2025-05 |

## Required Checklist After Behavior/Security Changes

- [ ] Updated relevant docs in `docs/`
- [ ] Updated `docs/19_DATA_INVENTORY.md` if PII handling changed
- [ ] Updated `docs/22_INCIDENT_RESPONSE.md` if runbook-affecting change
- [ ] Updated `docs/21_BILLING_STRATEGY.md` if metering changed
- [ ] ADR created if cross-cutting
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm --filter <package> test`)

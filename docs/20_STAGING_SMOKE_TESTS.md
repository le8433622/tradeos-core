# Staging Smoke Tests

## Purpose

This checklist is the required staging smoke evidence before any TradeOS production-readiness claim. Passing local build and tests is not enough. Staging must prove that Supabase auth, tenant data, registered actions, audit logs, webhooks, AI execution, billing/settings, and privacy paths work together against a real deployment.

## Preconditions

- Target environment is staging or Vercel preview connected to staging Supabase.
- `ALLOW_DEMO_AUTH=false` for staging smoke runs unless the task explicitly tests local demo mode.
- `DATABASE_URL` and `DIRECT_URL` point to the intended staging project, not production.
- Migrations have been applied to staging and verified with existing-data checks.
- A mapped Supabase test user exists with an ACTIVE `OrganizationMember` record.
- `HEALTHCHECK_SECRET`, webhook secrets, and Supabase publishable keys are configured in the target environment.

## Required Smoke Checklist

| #   | Scenario                                          | Required Evidence                                                                                      | Result |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Login with Supabase mapped user                   | User lands in tenant workspace; session has userId, organizationId, role, permissions, and mfaLevel    | TODO   |
| 2   | Open dashboard                                    | Dashboard loads only tenant-scoped metrics                                                             | TODO   |
| 3   | Create lead                                       | `crm.createLead` succeeds and audit log row exists                                                     | TODO   |
| 4   | Create company                                    | `crm.createCompany` succeeds and audit log row exists                                                  | TODO   |
| 5   | Create product                                    | `trade.createProduct` succeeds and audit log row exists                                                | TODO   |
| 6   | Create quotation with line items                  | `QuotationLineItem` rows are persisted and `totalAmount` equals quantity x unitPrice sum               | TODO   |
| 7   | Send quotation through approval path if high-risk | MFA/approval blocks unsafe execution; approved path changes quotation state                            | TODO   |
| 8   | Receive Zalo webhook test payload                 | Signed payload creates or reuses one webhook event; unsigned payload is rejected                       | TODO   |
| 9   | Process webhook via worker mode                   | Event processing creates inbox/conversation data or records a clear FAILED state                       | TODO   |
| 10  | Run AI agent route                                | Safe AI steps execute through registered actions with `source: "ai"`; risky steps become approvals     | TODO   |
| 11  | Update billing/profile settings                   | `PATCH /api/organization/settings` updates plan/profile/budget using registered actions and audit logs | TODO   |
| 12  | Export billing usage                              | `billing.export` requires AAL2 and returns redacted/minimal export evidence                            | TODO   |
| 13  | Export tenant data                                | `privacy.export` requires AAL2 and does not leak sensitive audit payloads                              | TODO   |
| 14  | Verify audit logs                                 | Mutations and blocked actions have tenant-scoped audit rows with redacted input/result                 | TODO   |
| 15  | Verify demo auth disabled                         | Production-like staging request without Supabase auth returns controlled auth error                    | TODO   |

## Issue #1 Regression Smoke

Run these after completing the P0/P1 fixes from GitHub issue #1:

| Task   | Scenario                                                                    | Expected Result                                                                            |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| T0.001 | PATCH `/api/organization/settings` with `aiMonthlyBudget`                   | Uses `budget.update`; no `Unknown action` error                                            |
| T0.001 | PATCH `/api/organization/settings` with `avgDealValue` and `conversionRate` | Uses `organization.settings.updateProfile`; no `Unknown action` error                      |
| T0.002 | POST `/api/quotations` with two line items                                  | Two `QuotationLineItem` rows exist and quotation total is computed from items              |
| T0.003 | Clear billing/AI numeric input in settings UI                               | No unexpected `VALIDATION_ERROR`; behavior is explicit                                     |
| T0.005 | Open billing usage for an org with active memberships                       | Seat count reflects ACTIVE `OrganizationMember` rows                                       |
| T0.006 | Archive more than 500 old webhook payloads                                  | Archive completes over batches without permanent failed jobs caused only by remaining rows |
| T1.001 | Run route-action parity check                                               | Every `executeAction("...")` literal in API routes maps to a registered action             |

## Evidence Template

```markdown
## Staging Smoke Evidence

Date:
Target URL:
Supabase project/ref:
Commit SHA:
Operator:

Commands:

- pnpm db:generate:
- pnpm typecheck:
- pnpm test:
- pnpm build:
- pnpm docs:check:
- pnpm lint:
- pnpm license:check:
- git diff --check:
- pnpm routes:check:
- RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test:

Smoke Results:

- Login:
- Dashboard:
- Lead creation and audit:
- Company creation and audit:
- Product creation and audit:
- Quotation with line items:
- Approval/MFA path:
- Webhook signed/unsigned/duplicate:
- Worker processing:
- AI agent route:
- Settings PATCH:
- Billing export:
- Privacy export:
- Audit log review:
- Demo auth disabled:

Residual Risks:

Rollback/Disable Path:
```

## Failure Rule

If any smoke item fails, do not claim production readiness. Record the failed scenario in `docs/13_CHECKPOINTS.md` with the exact endpoint/action, error, severity, and required fix.

# Action Registry Contract

## Purpose

The action registry is the execution boundary between UI, AI, policy, audit, and database mutation. ALL mutations must go through registered actions. Direct Prisma writes in API routes or components are strict exceptions only.

## Registered Action Shape

```typescript
type RegisteredAction<Input, Output> = {
  name: string;
  description: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  allowedRoles: ActorRole[];
  requiresApprovalForAI: boolean;
  handler: (input: Input, context: ActionContext) => Promise<Output> | Output;
};
```

## Action Context

```typescript
type ActionContext = {
  actorUserId?: string;
  organizationId?: string;
  role: "OWNER" | "ADMIN" | "SALES" | "OPERATOR" | "VIEWER";
  source: "manual" | "ai" | "system";
  approved?: boolean;
  mfaLevel?: "aal1" | "aal2";
  prismaTransactionClient?: TransactionClient;
};
```

## Risk Levels

### LOW

Safe operational action. Can be executed by most roles. AI may execute directly if `requiresApprovalForAI` is false.

Examples: create lead, create follow-up task, suggest partner, create product, ingest inbox message.

### MEDIUM

Creates commercial content or changes pipeline state. AI may draft, humans should review before external effects.

Examples: draft quotation, update lead qualification, update company/contact, update product.

### HIGH

External customer impact, data deletion, permission changes, bulk communication, privacy operations, or billing changes. Requires MFA and/or AI approval.

Examples: send quotation, anonymize PII, legal hold, role update, plan update, send bulk notification.

### CRITICAL

Irreversible, legal, financial, or security-sensitive action. (None currently registered — reserved for contract approval, payment state changes, cross-tenant data sharing.)

## Canonical Action Table

| Action                                | Package        | Risk   | Roles                         | AI Allowed | Approval Required | Audit Required |
| ------------------------------------- | -------------- | ------ | ----------------------------- | ---------- | ----------------- | -------------- |
| `crm.createLead`                      | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.createFollowUpTask`              | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.createCompany`                   | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.updateCompany`                   | crm-core       | MEDIUM | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.createContact`                   | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.updateContact`                   | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `crm.updateLeadStatus`                | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `user.invite`                         | crm-core       | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `user.roleUpdate`                     | crm-core       | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `notification.draft`                  | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `notification.sendBulk`               | crm-core       | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `organization.settings.updateProfile` | crm-core       | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `organization.settings.introductions` | crm-core       | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `billing.planUpdate`                  | crm-core       | HIGH   | OWNER                         | No         | Yes for AI        | Yes            |
| `billing.export`                      | analytics-core | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `budget.update`                       | crm-core       | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `ai.trackUsage`                       | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `budget.getStatus`                    | crm-core       | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `settings.security`                   | crm-core       | HIGH   | OWNER                         | No         | Yes for AI        | Yes            |
| `privacy.legalHold`                   | crm-core       | HIGH   | OWNER                         | No         | Yes for AI        | Yes            |
| `privacy.anonymizePii`                | crm-core       | HIGH   | OWNER                         | No         | Yes for AI        | Yes            |
| `privacy.export`                      | analytics-core | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `inbox.ingestMessage`                 | inbox-core     | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.draftQuotation`                | trade-core     | MEDIUM | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.sendQuotation`                 | trade-core     | HIGH   | OWNER, ADMIN                  | No         | Yes               | Yes            |
| `trade.suggestPartner`                | trade-core     | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.createProduct`                 | trade-core     | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.updateProduct`                 | trade-core     | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.proposeIntroduction`           | trade-core     | MEDIUM | OWNER, ADMIN, OPERATOR        | No         | Yes for AI        | Yes            |
| `trade.approveIntroduction`           | trade-core     | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `trade.rejectIntroduction`            | trade-core     | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `trade.disputeIntroduction`           | trade-core     | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `trade.reportIntroductionValue`       | trade-core     | LOW    | OWNER, ADMIN, OPERATOR        | Yes        | No                | Yes            |
| `report.snapshotCreate`               | analytics-core | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `report.snapshotApprove`              | analytics-core | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `sourcing.createRun`                  | sourcing-core  | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `sourcing.addSupplierCandidate`       | sourcing-core  | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `sourcing.addSupplierQuote`           | sourcing-core  | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `sourcing.compareQuotes`              | sourcing-core  | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `sourcing.markRunReadyForReview`      | sourcing-core  | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `sourcing.deliverBuyerReport`         | sourcing-core  | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `evidence.createItem`                 | evidence-core  | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `evidence.attachToRun`                | evidence-core  | LOW    | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `evidence.exportLedger`               | evidence-core  | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `checkpoint.create`                   | sourcing-core  | MEDIUM | OWNER, ADMIN                  | Yes        | No                | Yes            |
| `checkpoint.markDelivered`            | sourcing-core  | MEDIUM | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |
| `checkpoint.approveForBilling`        | sourcing-core  | HIGH   | OWNER                         | No         | Yes for AI        | Yes            |
| `handover.create`                     | sourcing-core  | MEDIUM | OWNER, ADMIN, SALES, OPERATOR | Yes        | No                | Yes            |
| `handover.resolve`                    | sourcing-core  | HIGH   | OWNER, ADMIN                  | No         | Yes for AI        | Yes            |

**Total: 49 registered actions** (LOW: 17, MEDIUM: 15, HIGH: 13, CRITICAL: 0)

## Always-MFA Actions

These actions ALWAYS require `mfaLevel === 'aal2'` through `policy-core`, regardless of organization MFA policy:

- `privacy.anonymizePii`
- `privacy.legalHold`
- `privacy.export`
- `billing.manage` (TODO — future action)
- `billing.export`
- `billing.planUpdate`
- `notification.sendBulk`
- `user.roleUpdate`
- `settings.security`
- `trade.approveIntroduction`

## Action Implementation Rules

Every registered mutation MUST:

1. Accept `organizationId` from validated input or context
2. Scope database writes to `organizationId`
3. Validate cross-record relations belong to the same organization
4. Return a JSON-serializable result
5. Let `executeAction` write audit logs (handler uses `db(context)`)
6. Throw clear, registered error codes for blocked or invalid actions
7. Treat `context.organizationId` as the trusted tenant and reject mismatched top-level `input.organizationId` through policy-core
8. Parse handler input with the exported Zod schema before any business logic (`safeParse(schema, input)` is the current package pattern)

## Direct Database Mutation Exceptions

Direct Prisma mutation outside registered actions is allowed ONLY for:

| Exception                          | Rationale                                        | Tenant-scoped? | Audit?             |
| ---------------------------------- | ------------------------------------------------ | -------------- | ------------------ |
| Auth user bootstrap                | First user creation needs no session             | Yes            | Yes (manual)       |
| Webhook event receipt              | RECEIVED/DUPLICATE status before action planning | Yes            | Via infra path     |
| Job-core status transitions        | Status changes within job-core                   | Yes            | Via infra path     |
| Migration / seed scripts           | CLI operations                                   | N/A            | No                 |
| Approval request state transitions | Owned by approval-core                           | Yes            | Via explicit audit |

All exceptions must be tenant-scoped where relevant. No exception allows bypassing audit or tenant isolation for domain entity mutations.

## Zod Validation Requirement

Every action handler MUST parse its input using the exported Zod schema:

```typescript
const parsed = safeParse(createLeadSchema, input);
// Use parsed, not input
```

Without runtime parsing, the handler bypasses the type-safe contract. This is mandatory for ALL actions regardless of risk level. Current code maps Zod failures to `INVALID_REQUEST_BODY` through local `safeParse()` wrappers.

## Approval Conversion Rule

If AI plans a HIGH/CRITICAL-risk action:

```
AI step
  → do NOT execute action directly
  → create ApprovalRequest with actionName and input
  → notify human reviewer
  → execute only after approval
```

Approval requests MUST:

- Validate actionName exists in registry
- Derive riskLevel from the registered action, NOT from the client
- Reject nested organizationId that doesn't match session org
- Store normalized organizationId matching session org
- Write audit log for creation
- Write audit logs for all state changes

## Action Input Validation Rules

Every Zod schema MUST validate:

1. `organizationId` is stripped (not accepted from client)
2. Required fields exist and are non-empty strings / positive numbers / valid enums
3. String fields have max length (256 default, 4096 for description/content)
4. Numeric fields are finite numbers within expected range
5. URL fields match URL format
6. Email fields match email format
7. Enum fields match the literal union (not freeform string)
8. Nested arrays/objects are validated recursively

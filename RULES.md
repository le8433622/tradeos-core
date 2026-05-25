# TradeOS Hard Rules — Production 10/10 Edition

This document is the single source of truth for every rule discovered through code review, incident analysis, production gaps, and super-detailed evaluation. These are NOT suggestions. Every agent, every developer, and every automated check MUST follow these rules. Violation severity is defined in Section 14 — any CRITICAL or HIGH violation blocks merge.

---

## 0. Mandatory Agent Quality Contract

### 0.1 No implementation without a complete context pass

Before editing ANY code, the agent MUST read in this exact order:

1. `RULES.md` — this file, EVERY time (failure of this rule = CRITICAL)
2. `agent.md` — execution workflow
3. `AGENTS.md` — repository charter
4. `docs/13_CHECKPOINTS.md` — current status, known blockers, residual risks
5. The owning package or route being changed — read the ENTIRE file
6. Existing tests for the owning package — read ALL test files
7. `docs/04_ACTION_REGISTRY.md` — if touching action registrations or adding new actions
8. `docs/06_SECURITY_AND_TENANCY.md` — if touching auth, webhook, tenant, or security
9. `docs/10_DEPLOYMENT_RUNBOOK.md` — if touching deployment, env vars, or CI
10. `docs/28_PRODUCTION_10_10_TASK_PLAN.md` — if this task is part of the production-readiness plan

If ANY item is skipped, the agent MUST state which item and why before making changes. Silent skipping is a CRITICAL rule violation.

### 0.2 Fix the root cause, not only the visible symptom

Every bug fix MUST answer these questions before completion:

1. What failed exactly? (error message, stack trace, unexpected output)
2. Why did it fail at the code level? (not "because bug" — the actual type/validation/permission/data defect)
3. Where is the owning boundary: route, package action, policy core, auth helper, database query, or UI component?
4. Could the same bug exist in sibling paths? (SEARCH BEFORE FIXING)
5. What verification proves this specific failure mode cannot recur? (unit test, regression test, type-level guard, runtime validation)

If the agent cannot answer all 5, it MUST keep investigating. Declaring "done" without these answers is a CRITICAL rule violation.

### 0.3 No known HIGH or CRITICAL issue may remain unhandled

After making ANY change, the agent MUST perform a self-review against this entire document. If it finds a HIGH or CRITICAL issue in the touched path:

- If the agent caused it → fix immediately before proceeding
- If it was pre-existing → fix it in the same turn OR explicitly declare it as a blocker with:
  - The exact issue and severity
  - The file and line number
  - The reason it cannot be fixed in this turn
  - The required fix for the next turn

The agent MUST NOT use language like "done", "complete", "production-ready" while known HIGH or CRITICAL issues remain in the changed path.

### 0.4 First-pass quality is mandatory — no iterative patching

Agents MUST optimize for one correct pass. A change is NOT acceptable just because it builds or tests pass. It MUST also satisfy ALL of:

1. Tenant isolation — every query scoped by `organizationId`
2. Permission or role gate — access control before mutation
3. Audit path for mutations — `executeAction` or explicit `auditLog.create`
4. MFA path when risk requires it — `mfaLevel` forwarded in context
5. Input validation with safe parsing — Zod `.parse()` or explicit type-safe parsing
6. Error classification — stable error codes in `api-errors.ts`
7. Tests OR documented manual verification — never "build passes" as verification
8. Checkpoint update when status changes — `docs/13_CHECKPOINTS.md`

"First-pass quality" means delivering all 8 in a single turn. If any is missing, the task is incomplete.

### 0.5 Never mark verification complete unless it actually ran

Forbidden patterns:

- "Tests pass" without running `pnpm test`
- "Build passes" without running `pnpm build`
- "Lint passes" without running `pnpm lint`
- "Typecheck passes" without running `pnpm typecheck`
- "Docs check passes" without running `pnpm docs:check`

If a check is skipped, record:

- The exact command that would have been run
- The concrete reason it was skipped (e.g., "Docker not available" — not "trust me it works")
- Whether this creates a verification gap

### 0.6 No speculative compatibility code

Do NOT add:

- Backward compatibility fallbacks for unshipped behavior
- Alternate paths for hypothetical edge cases
- Graceful degradation for unreleased features
- Dead code "for future use"

Exceptions: persisted production data exists, shipped consumer behavior, or an explicit user requirement. If unclear, ask one short question.

### 0.7 Worktree discipline — never revert unrelated changes

The repository may contain unrelated user or agent changes. The agent MUST:

1. Check `git status` before editing
2. Stage ONLY files touched by the current task
3. Never revert, modify, or undo unrelated changes
4. Mention in the final response if the worktree contains visible unrelated modifications

### 0.8 Doc integrity — code and docs must match exactly

Every behavioral change requires a corresponding doc update in the same turn:

- New action → update `docs/04_ACTION_REGISTRY.md`
- Role/risk/approval change → update `docs/04_ACTION_REGISTRY.md`
- Security/tenant/auth change → update `docs/06_SECURITY_AND_TENANCY.md`
- Testing change → update `docs/09_TESTING_STRATEGY.md`
- Deployment/env change → update `docs/10_DEPLOYMENT_RUNBOOK.md`
- Checkpoint change → update `docs/13_CHECKPOINTS.md`
- Task plan change → update `docs/12_TASK_PLAN.md` or `docs/28_PRODUCTION_10_10_TASK_PLAN.md`

The `pnpm docs:check` CI gate MUST pass before merge. If the gate would fail due to this change, fix the gate or update the doc.

---

## 1. Action Registration & Handler Rules

### 1.1 Always use `db(context)` — never global `prisma` inside handlers

Action handlers receive `context.prismaTransactionClient` from `executeAction()`. The `db(context)` helper returns this transaction client or falls back to global `prisma`.

```
// GOOD
function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}
handler: async (input, context) => { return db(context).lead.create({ ... }); }

// BAD — breaks audit transaction atomicity (CRITICAL)
handler: async (input, context) => { return prisma.lead.create({ ... }); }
```

**Why**: `executeAction` wraps handler + audit log write inside `prisma.$transaction`. Using global `prisma` skips the transaction, so the mutation could succeed while the audit log write fails (or vice versa), producing untracked mutations.

EVERY action package MUST define this helper:

```typescript
import { prisma } from "@tradeos/database";
function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}
```

### 1.2 Every update/mutation must validate `organizationId` on ALL referenced records

Before updating a record, verify it belongs to the caller's org. Before referencing related records (leadId, companyId, productId, etc.), verify those records also belong to the caller's org.

```
// GOOD
const existing = await db(context).contact.findUnique({
  where: { id: input.contactId },
  include: { company: true },
});
if (!existing) throw new Error('CONTACT_NOT_FOUND');
if (existing.organizationId !== context.organizationId)
  throw new Error('CONTACT_BELONGS_TO_ANOTHER_ORGANIZATION');

// BAD — only checks relation without checking the record's own org
if (existing.company?.organizationId !== context.organizationId)
  throw new Error('CONTACT_BELONGS_TO_ANOTHER_ORGANIZATION');
```

**Use `validateRecordBelongsToOrg` from `@tradeos/policy-core`** — it checks existence + org + clear error in one call.

### 1.2.1 `executeAction()` must reject top-level organization mismatch

Registered actions may accept `organizationId` in input, but the trusted tenant source is the action context. `executeAction()` MUST reject any input where input has a top-level `organizationId`, `organization_id`, or `orgId` that does not match `context.organizationId`.

Routes must still inject `session.organizationId`; this policy-core guard is defense-in-depth for approval replay, AI plans, and malformed callers.

### 1.3 Do NOT check org through indirect relations only

The original `updateContactAction` only checked `existing.company.organizationId` but not `existing.organizationId` for org-less contacts. **Always check the record's own `organizationId` first, then check relations.**

### 1.4 Cross-tenant actions (introductions) must validate BOTH sides

For actions involving multiple orgs (introductions, disputes, value reporting), the current user's org must be a legitimate participant:

```
// approveIntroductionAction: isBuyer OR isSeller
// disputeIntroductionAction: isBuyer OR isSeller OR isProposer (if allowed)
// reportIntroductionValueAction: isBuyer OR isSeller ONLY (no proposer)
```

### 1.5 Register every new action — never mutate DB outside an action

**No direct Prisma writes in API routes or page components.** Every mutation must go through a registered action in `@tradeos/policy-core`. If no action exists for the operation, create one first.

Exception: infrastructure boundaries:

- Auth bootstrap (first user creation)
- Webhook event receipt before action planning (RECEIVED/DUPLICATE status)
- Job-core internal operations (status transitions, backoff)
- Migration and seed scripts
- Settings route that dispatches to registered actions (but the route itself writes nothing)

Even exceptions must be tenant-scoped where relevant and documented in `docs/04_ACTION_REGISTRY.md` Section "Direct Database Mutation Exceptions".

### 1.6 Permission keys must be added to the seed

Every new action needs a corresponding permission key in `packages/database/prisma/seed.ts::PERMISSIONS`. Add it to the array, assign it to appropriate roles in the `ROLES` map, then run the seed.

**Forgotten permission keys cause 403 PERMISSION_DENIED errors at runtime.** Always verify the seed after adding a new action or permission-gated feature. Verify with:

```
grep -c "'.actionName'" packages/database/prisma/seed.ts
```

### 1.7 `ALWAYS_REQUIRE_MFA_ACTIONS` must include risky new actions

If a new action is HIGH/CRITICAL risk AND involves any of:

- Security settings
- Privacy / PII
- Billing / plan
- User management (invite, role change)
- Third-party relationship / identity disclosure
- Data deletion / anonymization
- Export of sensitive data

Add it to `ALWAYS_REQUIRE_MFA_ACTIONS` in `packages/policy-core/src/index.ts`.

### 1.8 Every action handler MUST validate input via Zod `.parse()` at handler entry

Schemas are exported alongside each action. The handler MUST call `.parse()` on its input before any business logic:

```
// GOOD
const parsed = createLeadInputSchema.parse(input);
// Use parsed, not input, for all downstream operations

// BAD — uses raw `input` without schema validation
handler: async (input, context) => { ... }
```

This is mandatory for ALL actions regardless of risk level. The Zod schema defines the contract. Without `.parse()`, the handler accepts arbitrary untyped data, bypassing the API route's type safety.

### 1.9 Every ALWAYS_REQUIRE_MFA_ACTIONS entry must have a real handler

No action in `ALWAYS_REQUIRE_MFA_ACTIONS` may exist without a corresponding `registerAction()` call. If an action is planned but not yet implemented:

- Either implement it with a real handler
- Or remove it from `ALWAYS_REQUIRE_MFA_ACTIONS` with a documented `// TODO` and the planned implementation date
- If it's a future work item, add a tracking issue reference

---

## 2. MFA Enforcement Rules

### 2.1 `mfaLevel` must be passed from session to EVERY `executeAction` call

`executeAction` checks `context.mfaLevel === 'aal2'` for sensitive actions. **Every API route that calls `executeAction` MUST pass `session.mfaLevel` in the context.**

```
// GOOD (every single call site)
const result = await executeAction(actionName, input, {
  actorUserId: session.userId,
  organizationId: session.organizationId,
  role: session.role,
  source: 'manual',
  mfaLevel: session.mfaLevel,
});

// BAD — mfaLevel is undefined, all MFA checks will fail closed (block even AAL2 users)
```

There are exactly 11+ call sites. ALL must include `mfaLevel`. Missing one is HIGH severity.

### 2.2 Session resolution MUST read real MFA level from Supabase token

Production session resolution must derive `mfaLevel` from the Supabase access token AAL claim. Use `getSessionAal(accessToken)` which decodes the JWT payload.

- Demo auth returns `'aal1'` (acceptable because demo auth is local-only and disabled in production)
- Page sessions (`requirePageSession`) must pass real MFA level
- API sessions (`requireSessionFromRequest` -> `resolveSessionFromEmail`) must pass real MFA level

Hardcoded `'aal1'` in production makes MFA enforcement a permanent blocker for all `ALWAYS_REQUIRE_MFA_ACTIONS`.

### 2.3 MFA enforcement matrix (exact, not approximate)

| Condition                                                 | MFA Check             | Behavior                                                                                          |
| --------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Action in `ALWAYS_REQUIRE_MFA_ACTIONS`                    | `mfaLevel === 'aal2'` | Block with `MFA_REQUIRED` if NOT aal2; does NOT check org policy                                  |
| Action HIGH/CRITICAL AND `org.mfaRequired === true`       | `mfaLevel === 'aal2'` | Block with `MFA_REQUIRED` if NOT aal2                                                             |
| Action HIGH/CRITICAL AND `org.mfaRequired === false/null` | No MFA check          | Pass regardless of mfaLevel                                                                       |
| Action LOW/MEDIUM (not in ALWAYS_REQUIRE)                 | No MFA check          | Pass regardless of mfaLevel                                                                       |
| `context.organizationId` is undefined/falsy               | Skipped               | MFA check block is skipped (edge case — orgId should always be present for tenant-scoped actions) |

### 2.4 MFA check ordering in `executeAction`

The MFA check in `executeAction` MUST happen BEFORE starting the `prisma.$transaction` (to avoid wasted transactions). Current ordering is correct:

1. `assertInputOrganizationMatchesContext`
2. `canExecuteAction` (role + AI approval gate)
3. MFA check (always-mfa first, then org-policy)
4. `prisma.$transaction` wrapping handler + audit write

### 2.5 MFA audit coverage

Every MFA block must write an audit log entry (done through `writeAuditLog` in the blocked-action path). Verify that:

- An action blocked by MFA creates an audit log with `approved: false`
- The audit log shows `MFA_REQUIRED` as the reason

---

## 3. API Route Rules

### 3.1 Every protected route MUST use `withApiPermission` or `withApiSession`

```
// Permission-gated routes (Phase 18+)
const auth = await withApiPermission(request, 'permission.key');
if (auth.response) return auth.response;
const { session } = auth;

// Role-gated routes (current model)
const auth = await withApiSession(request, ['OWNER', 'ADMIN']);
if (auth.response) return auth.response;
```

Do NOT call raw `requireSessionFromRequest` directly in route handlers. Always go through `withApiSession` or `withApiPermission` so errors are classified uniformly.

### 3.2 `organizationId` comes from session, NEVER from request body

Strip `organizationId` or `orgId` from request bodies using `stripSessionManagedFields` from `apps/web/lib/validate.ts`. Inject `session.organizationId` into action inputs server-side.

### 3.3 Webhook routes must NOT use session-based auth

Public webhook endpoints (`/api/webhooks/*`) receive requests from external providers (Zalo, WhatsApp, Email), not from logged-in users. These routes MUST use:

- `requireWebhookTenant()` for shared-secret routes
- `resolveWebhookTenantFromIntegration()` for integration-based routes
- NEVER `withApiPermission`, `withApiSession`, or `requireSessionFromRequest`

### 3.4 Route-level Zod validation — every POST/PATCH body must use `.parse()`

Every API route that accepts a request body MUST:

1. Call `request.json()` and parse via Zod schema: `const body = schema.parse(await request.json())`
2. NEVER do ad-hoc validation after `.parse()` — the schema is the complete validation
3. Catch `ZodError` at the route level and return 400 with formatted issues
4. Use `stripSessionManagedFields` AFTER parsing to remove org fields from client input

API routes that currently lack Zod `.parse()`:

- `POST /api/agent` — missing entirely
- `PATCH /api/leads` — missing entirely
- `PATCH /api/introductions/[id]` — missing entirely

These are HIGH-severity blockers.

### 3.5 Error classification must handle every error code

Update `apps/web/lib/api-errors.ts::classifyApiError` to handle ALL known error codes. The classification pattern:

| Pattern                                                             | HTTP Status | Public Code                   | Example                    |
| ------------------------------------------------------------------- | ----------- | ----------------------------- | -------------------------- |
| `AUTH_REQUIRED`                                                     | 401         | `AUTH_REQUIRED`               | Missing or expired session |
| `ROLE_ACCESS_DENIED` / `PERMISSION_DENIED`                          | 403         | `ROLE_ACCESS_DENIED`          | Insufficient role          |
| `ORGANIZATION_ACCESS_DENIED` / `*_ACCESS_DENIED` / `*_ORG_MISMATCH` | 403         | `ORGANIZATION_ACCESS_DENIED`  | Cross-tenant access        |
| `MFA_REQUIRED`                                                      | 403         | `MFA_REQUIRED`                | MFA not satisfied          |
| `*_NOT_FOUND`                                                       | 404         | As-is                         | Resource missing           |
| `*_INVALID` / `*_REQUIRED` / `*_MISSING`                            | 400         | As-is                         | Validation failure         |
| `INVALID_APPROVAL_TRANSITION`                                       | 400         | `INVALID_APPROVAL_TRANSITION` | Invalid status change      |
| `WEBHOOK_UNAUTHORIZED`                                              | 401         | `WEBHOOK_UNAUTHORIZED`        | Bad webhook signature      |
| `ZodError`                                                          | 400         | `INVALID_REQUEST_BODY`        | Input validation failure   |

Every new error code added in handlers MUST be added to `ERROR_MESSAGES` with EN + VI translations.

### 3.6 Settings mutations MUST go through registered actions

Settings `PATCH` endpoints that modify org-level business settings MUST:

1. Check permission via `withApiPermission` (per-field if different permissions)
2. Preflight ALL field-level permissions before the first mutation
3. Validate and safely parse ALL inputs before the first mutation
4. Dispatch EACH field group through its OWN registered action via `executeAction`
5. Ensure each mutation writes an audit log through `executeAction`
6. Return the CURRENT state after mutation, not placeholder values

Direct `prisma.organization.update` in settings routes is CRITICAL severity — prohibited unless explicitly documented as an infrastructure boundary with own redacted audit log.

### 3.7 Multi-field mutations require preflight and atomicity analysis

If one request can update multiple fields:

1. Check ALL permissions before executing ANY write
2. Validate ALL inputs before executing ANY write
3. If partial success would be harmful → create ONE composite registered action wrapping `prisma.$transaction`
4. Sequential `executeAction` calls are acceptable ONLY when partial success is documented as safe

### 3.7.1 Approval request creation rules

Approval creation MUST:

1. Validate `actionName` exists in the registered action registry (reject unknown actions)
2. Derive `riskLevel` from the registered action, NEVER from the client
3. Reject any nested `organizationId`, `organization_id`, or `orgId` that does not match the session org
4. Store normalized `organizationId` matching the session org
5. Write an audit log for the creation event
6. Write audit logs for approve/reject/execute/fail state changes transactionally

### 3.8 Never parse booleans with `Boolean(value)` for API input

`Boolean('false') === true`. Use explicit parsing:

```
function toBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return undefined;
}
```

For numeric fields: `value == null ? null : Number(value)` when serializing nullable decimals.

### 3.9 Payload size check must read actual body, not just Content-Length header

`checkPayloadSize` currently relies on `Content-Length` header. This can be spoofed. For routes processing webhook bodies:

- Read the actual body bytes and compare against limit
- Use a streaming body reader with a size cap

Current `checkPayloadSize` in `apps/web/lib/validate.ts` is LOW severity (defense-in-depth), but should be hardened.

### 3.10 Sensitive exports require MFA + audit + no PII in audit

Tenant privacy exports and billing exports:

- Must execute through registered actions (`privacy.export`, `billing.export`)
- Require `mfaLevel === 'aal2'`
- Write MINIMAL audit entries: summary/count metadata only
- NEVER write exported PII payload into audit logs

### 3.11 Deep health endpoints are operational endpoints

Deep health endpoints (`/api/health/deep`) that expose database or queue state:

- Protected by `HEALTHCHECK_SECRET` in production
- Return operational status without tenant data
- Not exposed publicly

Public shallow health (`/api/health`) may return 200 with simple status if configured.

### 3.12 Request tracing — X-Request-Id must survive middleware

The `X-Request-Id` header set in middleware must NOT be dropped when cookies are refreshed. Current middleware drops the header when `NextResponse.redirect()` replaces response headers. Fix: Preserve `X-Request-Id` in all response paths.

---

## 4. Page / UI Rules

### 4.1 Protected pages must use `requirePageSession` or `requirePagePermission`

```
// Permission-gated page (Phase 18+)
const session = await requirePagePermission('permission.key');

// Role-gated page (current model)
const session = await requirePageSession(['OWNER', 'ADMIN']);
```

### 4.2 Page-level redirect on permission denied goes to `/` NOT `/dashboard`

`requirePagePermission` redirects to `/?error=permission_denied`. The `/dashboard` endpoint does not exist as a standalone page.

### 4.3 Server actions in pages must not bypass the API or registered actions

If a page has a Server Action (e.g., `inviteMember` in team settings), that action MUST:

1. Call a registered action OR route through the API
2. Write audit log
3. Validate inputs
4. Check permissions

**Direct `prisma.invitation.create` in a server action bypasses ALL policy, audit, MFA enforcement.**

### 4.4 Invitation accept flow: POST, not GET

The invitation accept page (`/invite/[token]`) currently mutates DB on page load (GET). This is unsafe because:

- GET requests should be idempotent
- Email preview tools and bots can trigger unwanted membership
- No CSRF protection

**Fix: Already converted to POST server action per G0.Security.003.** Verify any remaining GET-mutation patterns.

### 4.5 Client components that fetch settings data must handle 403 gracefully

Settings pages (`/settings/ai`, `/settings/billing`, `/settings/privacy`) are client components that fetch from `/api/organization/settings`. If the user lacks permission, the API returns 403. The UI MUST show a meaningful message, NOT a blank page or broken state.

### 4.6 Empty states — every list page must handle zero results

Every list page (leads, products, approvals, quotations, audit-logs, conversations, companies, notifications, webhook-events, reports) MUST show a contextual `EmptyState` component when the result set is empty. All 10 list pages are verified.

---

## 5. Database & Seed Rules

### 5.1 Every new mutable entity needs audit log support

If a new database table is created that stores user-generated business data, mutations on it MUST write to `auditLog`.

### 5.2 Seed must create `OrganizationMember` for demo user

The demo user needs an `OrganizationMember` record in addition to the legacy `User.role` field. Session resolution uses `OrganizationMember.role` first and falls back to `user.role` only when no membership is found.

### 5.3 Migration safety — NEVER add non-nullable column to existing table without default or backfill

Any migration that adds a non-nullable column to an existing table with possible data MUST:

1. First add the column as nullable
2. Backfill existing rows with a default value
3. Then alter the column to NOT NULL

Alternatively, for tables that are guaranteed empty (seed-only, no production data), document the guarantee inline.

**The current migration `20260522_deal_orgid` adds `organizationId` as non-nullable to the `Deal` table without backfill. This breaks on existing data. Fix: make nullable with backfill step.**

### 5.4 Permission keys must follow the `domain.action` naming convention

Format: `{domain}.{verb}`. Examples: `lead.read`, `organization.settings.write`, `billing.export`. Use consistently.

### 5.5 Every new permission key must be assigned to at least the OWNER role

When adding a new permission key, include it in the `OWNER` role's permission list (which gets all permissions by default via `PERMISSIONS.map(p => p.key)`).

### 5.6 Seed script must be runnable and verified

```
pnpm db:seed
```

After seed changes, verify:

- All permission keys exist
- All roles exist
- Demo user exists with OrganizationMember
- No duplicate keys

### 5.7 There must be a `db:seed` script in root `package.json`

Current state: exists. If not, add it.

---

## 6. Tenant Isolation Rules

### 6.1 Every tenant-scoped Prisma query MUST include `organizationId`

**Enforced by middleware:** A Prisma middleware (`packages/database/src/tenant-guard.ts`) now enforces this automatically. Any `findMany`, `findFirst`, `count`, `aggregate`, `groupBy`, `update`, `updateMany`, `delete`, `deleteMany`, `create`, `createMany`, or `upsert` on a tenant-scoped model **must** include `organizationId` in `where` or `data`, or the middleware throws `TENANT_SCOPE_REQUIRED`.

```typescript
// GOOD
prisma.lead.findMany({ where: { organizationId: session.organizationId } });

// BAD — throws TENANT_SCOPE_REQUIRED (CRITICAL)
prisma.lead.findMany();
```

**Exempt operations:** `findUnique` is exempt by design — single-record lookups by ID are validated at the application layer. **Exempt models:** `User`, `Organization`, `Role`, `Permission`, `RolePermission`, and global reference data.

See `packages/database/src/tenant-guard.ts` for the complete list of tenant-scoped models.

### 6.2 Multi-org queries must use `OrganizationMember` join table

When querying for a user's organizations, use `OrganizationMember` not `User.organizationId`. The `User.organizationId` is a legacy field; `OrganizationMember` is the source of truth.

### 6.3 Cross-org data access must verify membership

If an API needs to read data from another org (e.g., introductions):

- Verify the current user has an ACTIVE membership in THAT org
- OR verify data sharing is explicitly authorized

### 6.4 Cross-tenant action validation — every action must verify referenced records

Every registered action that touches a record (lead, company, contact, quotation, product, task) MUST:

1. Load the record by ID
2. Verify `record.organizationId === context.organizationId`
3. If the record has a relation (e.g., company through contact), also verify the relation's org
4. Use `validateRecordBelongsToOrg` helper

### 6.5 API routes must derive `organizationId` from session, not from request body

The session IS the source of truth for tenant identity. API routes MUST:

1. Resolve session
2. Strip `organizationId`/`orgId` from the request body
3. Attach the session's `organizationId` to action inputs
4. Set `X-Organization-Id` in the response header for debugging

---

## 7. Audit Log Rules

### 7.1 All mutations through registered actions automatically get audit logs

This is handled by `executeAction` wrapping handler + audit write in `prisma.$transaction`. No extra code needed in handlers.

BUT: the handler MUST use `db(context)` not global `prisma` for the transaction to be effective.

### 7.2 Mutations NOT through registered actions must write explicit audit logs

Settings API, server actions, and other direct Prisma writes MUST call `prisma.auditLog.create` explicitly with:

- `organizationId` (from session, not from input)
- `actorUserId` (from session)
- `actionName` (dot-notation format, must match established convention)
- `riskLevel` (appropriate for the operation)
- `input` (redacted via `redactForAudit`)
- `result` (redacted via `redactForAudit`)
- `approved` (true for manual mutations, false for blocked/infrastructure)

### 7.3 Audit input/output must be redacted before storage

Use `redactForAudit` from `@tradeos/policy-core` before writing `input` or `result` to audit logs. This masks:

- Emails: `alice@example.com` → `a***e@example.com`
- Phones: `+84912345678` → `+84*****5678`
- Sensitive keys: `password`, `secret`, `token`, `apiKey`, `authorization`, `creditCard`, `ssn`, `taxId`

Redaction is recursive up to 10 levels deep.

### 7.4 Blocked action attempts must create audit logs

When `executeAction` blocks an action (role denied, org mismatch, MFA required, AI not approved), the block MUST be recorded in audit log with `approved: false` and the block reason.

### 7.5 Approval state transitions must write audit logs

Every approval state change (created → PENDING, PENDING → APPROVED, PENDING → REJECTED, APPROVED → EXECUTING, EXECUTING → EXECUTED, EXECUTING → FAILED) MUST write an audit log entry.

---

## 8. Invitation Rules

### 8.1 Validate the invited email matches the accepting user's session email

On invitation accept, compare `session.email` against `invitation.email`. Reject with clear message if they don't match. Email comparison must be case-insensitive after normalization (`trim().toLowerCase()`).

### 8.2 Validate `roleId` exists and `isSystem` before creating invitation

When creating an invitation, verify:

```
const role = await db(context).role.findUnique({ where: { id: roleId } });
if (!role || !role.isSystem) throw new Error('INVALID_ROLE');
```

### 8.3 Invitation accept must write audit log

Even though invitation accept is not a registered action (it's an infrastructure boundary), it MUST call `prisma.auditLog.create` with the accept event.

### 8.4 Email normalization on invite

The `user.invite` action normalizes email: `trim().toLowerCase()`. The `resolveSessionFromEmail` function MUST also normalize to prevent case-mismatch duplicates.

---

## 9. Testing Rules

### 9.1 Every policy-core change needs tests

Tests live in `packages/policy-core/src/__tests__/`. Minimum coverage:

- `assertPermission`, `hasPermission`, `can` for permission assertion
- `isActionMfaRequired` for both always-MFA and non-MFA actions
- Role checking and enforcement
- Action execution permission gating (allowed vs denied)

### 9.2 New registered actions must have tests

At minimum, test each new action for:

- Allowed role can execute successfully
- Denied role is blocked with correct error
- Cross-tenant input is rejected with `ORGANIZATION_ACCESS_DENIED`
- Audit log is written (verify through `executeAction` mock)

For HIGH or CRITICAL actions: tests are MANDATORY. If no test harness exists, the agent MUST either add one or document the gap as a blocker in checkpoint.

### 9.3 REGRESSION tests must target the bug, not only the happy path

When fixing a bug found by review or production analysis, add or document a regression check that would have FAILED before the fix:

- `Boolean('false')` parsing → test with string input `'false'`
- Cross-tenant access → test with a different `organizationId`
- MFA-required actions → test with `aal1` (blocked) and `aal2` (passes)
- Cookie auth parsing → test with real Supabase cookie shapes

### 9.4 No fake test completion — build is not a test

`pnpm build` verifies compilation. `pnpm test` verifies behavior. These are SEPARATE gates. The final response MUST report:

- Build result (pass/fail with command)
- Test result (pass/fail with command, count of tests)
- Manual verification (if applicable, with exact commands or curl requests)

### 9.5 Every package test suite must run independently

```
pnpm --filter @tradeos/policy-core test
pnpm --filter @tradeos/auth test
pnpm --filter @tradeos/crm-core test
pnpm --filter @tradeos/trade-core test
pnpm --filter @tradeos/ai-core test
pnpm --filter @tradeos/webhook-core test
pnpm --filter @tradeos/approval-core test
pnpm --filter @tradeos/analytics-core test
pnpm --filter @tradeos/inbox-core test
pnpm --filter @tradeos/job-core test
```

All must pass. If one fails, the task is not done.

### 9.6 Tooling gates must be non-interactive

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm license:check`, `pnpm docs:check`, and `pnpm build` MUST run without interactive prompts. If a command prompts for setup, pin/configure the tool instead of documenting a fake pass.

### 9.7 CI pipeline must have all required gates

The GitHub Actions CI workflow (`.github/workflows/ci.yml`) MUST include:

1. `pnpm install` (with caching)
2. `pnpm typecheck` (all 13 packages)
3. `pnpm build` (with env vars for DB generate)
4. `pnpm test` (all test suites)
5. `pnpm lint` (no warnings)
6. `pnpm docs:check` (action registry parity)
7. `pnpm license:check` (no blocked licenses)
8. `pnpm --filter @tradeos/ai-core eval` (AI evaluation gates, only when ai-core changes)
9. `git diff --check` (no whitespace errors)

### 9.8 Pre-commit hook must be gating

`.husky/pre-commit` MUST run and fail on:

1. `pnpm docs:check` — fail on action registry mismatch
2. `lint-staged` — fail on formatting errors (no `|| true`)
3. `pnpm typecheck` — fail on type errors

Current `.husky/pre-commit` has `npx lint-staged || echo "  (prettier check skipped)"` — the `|| echo` makes formatting non-gating. Fix: remove the `|| echo` fallback.

---

## 10. Security Anti-Patterns (NEVER Do These)

### 10.1 Never hardcode `demo-org` in production code paths (CRITICAL)

```
// BAD — read from environment or session, never hardcode
prisma.lead.findMany({ where: { organizationId: 'demo-org' } });
```

Demo organization IDs are for local development only. Always use `session.organizationId`.

### 10.2 Never expose stack traces in API responses (CRITICAL)

All API errors MUST go through `apiErrorResponse` which sanitizes messages. Never return raw `Error.message` or `error.stack`.

### 10.3 Never let AI call Prisma directly (CRITICAL)

AI agents MUST call registered actions through `@tradeos/policy-core`. The `ai-core` package MUST NOT import `@prisma/client` or `@tradeos/database`.

### 10.4 Never use `eval()` or dynamic `require()` (CRITICAL)

No dynamic code execution. All action names must match registered action names, not be constructed from user input.

### 10.5 Never skip input validation for security-critical fields (HIGH)

- Plan changes: validate against allowed plan list
- AI budget: validate positive number
- Conversion rate: validate 0–1 range
- Role updates: validate role exists and `isSystem`
- Quotation items: validate quantity > 0, unitPrice >= 0
- Organization name/domain: validate string length

### 10.6 Public webhook tenant headers are production-disabled by default (HIGH)

Production webhook tenant resolution MUST prefer provider-bound integrations (`WebhookIntegration` registry). Caller-controlled `x-organization-id` is disabled in production unless explicit `ALLOW_WEBHOOK_ORG_HEADER=true` exception is set AND documented.

### 10.7 Webhook processing must be retry-idempotent (HIGH)

Webhook processing MUST avoid duplicating:

- Inbox messages (store inboxId before AI processing)
- AI side effects (track processed event keys)
- Worker state changes (fallo recovery for stale RUNNING jobs)

### 10.8 Comments must not contain sensitive information (HIGH)

No secrets, API keys, database URLs, or internal IPs in code comments.

### 10.9 Webhook agent failure must not silently mark as PROCESSED (HIGH)

When `runTradeAgent` fails during webhook processing, the event MUST NOT be marked as `PROCESSED`. Current pipeline logic may swallow agent failures. Fix: mark event as `FAILED` with the agent error, or `PROCESSED_WITH_ERROR` if partial success. The agent error MUST be recorded in `webhookEvent.errorMessage`.

### 10.10 Asynchronous context must not bypass policy gates (HIGH)

When `runTradeAgent` is called from webhook processing, it uses `{ source: 'ai', approved: false }` context. This correctly goes through AI approval gates for HIGH-risk actions. BUT: ensure the context `source` is `'ai'` (not `'manual'`) for webhook-triggered AI execution. The `'manual'` source bypasses `requiresApprovalForAI` checks.

### 10.11 Action handler Zod.parse() is mandatory for all actions (HIGH)

Every registered action handler MUST call `.parse()` on its input. Without this:

- The handler receives potentially malformed data
- The exported Zod schema is documentation-only, not enforced
- A bypass of the API route layer means unvalidated input reaches the DB

### 10.12 Migration non-nullable columns without backfill are unsafe (HIGH)

See Rule 5.3. The `Deal.organizationId` migration is currently unsafe for production data.

---

## 11. Coding Style & Convention Rules

### 11.1 `db(context)` helper pattern — every action package must define it

```
function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}
```

This exists in crm-core, trade-core, inbox-core, analytics-core. Verify on new packages.

### 11.2 Package exports pattern

Each domain package must export a `register{Name}Actions()` function that returns the array of registered action definitions.

### 11.3 Input type naming

Action input types should be named `{ActionName}Input` (e.g., `CreateLeadInput`). Export them from the package for reuse. Zod schemas should be named `{ActionName}InputSchema` or `{actionName}Schema`.

### 11.4 Error message format

Error codes thrown from action handlers must:

- Use `UPPER_SNAKE_CASE` format
- Be registered in `ERROR_MESSAGES` in `api-errors.ts` with EN + VI translations
- Follow the classification patterns from Rule 3.4

### 11.5 Keep API routes thin

API route files should only contain:

1. Session resolution (`withApiSession` or `withApiPermission`)
2. Permission check (role or permission assertion)
3. Input parsing (Zod `.parse()`)
4. Action call (`executeAction`)
5. Response construction

Domain logic stays in packages.

### 11.6 Constants extraction — no magic numbers

All magic numbers (timeouts, limits, thresholds, intervals) MUST be named constants exported from a `constants.ts` file in the owning package. Currently extracted:

- `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_EVENTS` (webhook-core)
- `MAX_PAYLOAD_SIZE_KB`, `MAX_EVENT_KEY_TEXT_LENGTH` (webhook-core)
- `MAX_SUMMARY_LENGTH` (ai-core)
- `CONFIDENCE_HIGH`, `CONFIDENCE_MEDIUM`, `CONFIDENCE_LOW` (ai-core)
- `DEFAULT_POLL_INTERVAL_MS`, `MAX_BACKOFF_MS` (job-core)
- `MAX_AUDIT_DISPLAY_LENGTH`, `MAX_REDACT_DEPTH` (policy-core)

New constants MUST follow this pattern.

### 11.7 Structured logging — no console.log in source files

Zero `console.log` / `console.error` in source packages (exclude seeds and CLI scripts). Use `createLogger(requestId)` from `apps/web/lib/logger.ts`. Log format: `{ timestamp, level, message, context }`.

---

## 12. CI & Pre-commit Gates

### 12.1 GitHub Actions CI — MUST exist and be green

File: `.github/workflows/ci.yml`

Required workflow jobs:

1. `install`: Setup Node 20.x, corepack enable, pnpm install (with cache)
2. `typecheck`: `pnpm typecheck` — all 13 packages must pass
3. `build`: `pnpm db:generate && pnpm build`
4. `test`: `pnpm test` — all test suites must pass
5. `lint`: `pnpm lint` — no warnings
6. `docs-check`: `pnpm docs:check` — action registry parity
7. `license-check`: `pnpm license:check` — no blocked licenses
8. `ai-eval` (conditional on ai-core changes): `pnpm --filter @tradeos/ai-core eval`
9. `whitespace`: `git diff --check`

Branch protection rules:

- `main` branch: require all status checks to pass
- Require PR review before merge
- Do NOT allow merge if checks pending

### 12.2 Pre-commit hook — MUST be gating

`.husky/pre-commit` content:

```
pnpm docs:check || exit 1
npx lint-staged
pnpm typecheck || exit 1
```

No `|| true`, no `|| echo` fallbacks for lint-staged. Formatting failures MUST block the commit.

### 12.3 `pnpm docs:check` — CI gate for action registry parity

The `scripts/check-docs.mjs` script (or its upgraded version) MUST:

1. Parse all `registerAction({ name: '...' })` calls from source code
2. Parse the action table from `docs/04_ACTION_REGISTRY.md`
3. Report any action name present in source but missing from docs (FAIL)
4. Report any action name present in docs but missing from source (WARN — may be planned)
5. Exit code 1 on failure, 0 on pass

### 12.4 Docs check upgrade — MUST compare risk/roles/approval, not just names

Current `scripts/check-docs.mjs` only checks action names. Upgrade it to also verify:

- `riskLevel` matches between source and doc table
- `allowedRoles` match between source and doc table
- `requiresApprovalForAI` matches between source and doc table

This is missing today and causes silent doc rot.

---

## 13. Deployment & Production Rules

### 13.1 Production ops require explicit task authorization

Production-impacting operations:

- `git push` to main/production branch
- `gh pr merge`
- `vercel --prod`
- Supabase production migration
- Cloudflare DNS/WAF/cache/worker changes
- Secret rotation
- Tenant data deletion

Each operation requires documented:

- Target environment (URL, project ID)
- Exact command
- Expected effect
- Rollback path
- Verification step

### 13.2 `ALLOW_DEMO_AUTH=false` must be set in production

Production Vercel/Supabase env must set `ALLOW_DEMO_AUTH=false`. If any request resolves a demo session in production, it must return an auth error.

### 13.3 Database migration safety

Every production migration requires:

1. Review SQL before running
2. Identify affected tables and row counts
3. Define rollback SQL (forward-fix is preferred over destructive revert)
4. Define verification queries
5. Run on staging first
6. Create backup before production migration

Never add non-nullable column without backfill (Rule 5.3).

### 13.4 Vercel deployment verification

After Vercel deploy, verify:

1. `/api/health` returns 200
2. `/api/health/deep` returns component status (with HEALTHCHECK_SECRET)
3. Login with valid credentials succeeds
4. Tenant dashboard loads with correct org data
5. Lead creation through API succeeds
6. Audit log is written for safe mutation
7. Unsigned webhook request is rejected with 401
8. Signed webhook request is processed
9. Duplicate webhook returns idempotent response (200 without creating duplicate)

### 13.5 Environment variable verification

Every env var change requires:

1. Confirm the var is set in ALL required environments (preview, staging, production)
2. Confirm the var is NOT committed in source or docs (only placeholder examples in docs)
3. Confirm the var has the correct value per environment (no staging DATABASE_URL in production)

### 13.6 Secrets rotation discipline

When rotating secrets:

1. Document the rotation in deployment notes
2. Update all environments simultaneously (or validate rollover window)
3. Test with new secret before deactivating old secret
4. Check git log for any accidental exposure of the previous secret

---

## 14. Rule Violation Severity

| Severity | Definition                                        | Example                                                                                                                                       |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL | Security hole, data leak, complete feature block  | Global prisma in handler, hardcoded org ID, missing tenant check, no input validation                                                         |
| HIGH     | Incorrect behavior, broken enforcement, audit gap | Missing `mfaLevel`, missed permission key, no `.parse()` on action input, webhook agent failure swallowed, migration unsafe for existing data |
| MEDIUM   | Non-ideal pattern, tech debt, missing tests       | Client page doesn't handle 403, missing integration tests, weak doc-check regex                                                               |
| LOW      | Convention violation                              | Wrong naming, missed doc update, missing constant extraction                                                                                  |

**All CRITICAL and HIGH violations MUST be fixed before merge.** MEDIUM and LOW violations should be documented and tracked.

---

## 15. Build & Verification Checklist

Before finishing ANY code change:

### Pre-submit: 15 questions

1. Did I introduce a direct database write that should be a registered action?
2. Did EVERY tenant-scoped query include `organizationId` or an explicit cross-tenant authorization rule?
3. Did EVERY mutation have permission, audit, and failure behavior?
4. Did EVERY risky mutation have MFA or approval behavior?
5. Did I validate input types with Zod `.parse()` instead of coercing blindly?
6. Did I run `pnpm typecheck` and confirm it passes?
7. Did I run `pnpm build` and confirm it passes?
8. Did I run `pnpm test` and confirm ALL suites pass?
9. Did I run `pnpm docs:check` and confirm it passes?
10. Did I run `pnpm lint` and confirm no new warnings?
11. Did I run `pnpm license:check` and confirm it passes?
12. Did I check `git diff --check` for whitespace errors?
13. Did I update `docs/13_CHECKPOINTS.md` if status/blockers changed?
14. Did I update the relevant contract doc if behavior/security/env changed?
15. Did I record skipped checks and why?

If ANY answer is "no", the agent MUST fix it or explicitly mark the task incomplete.

### Per-task verification commands

| Change type           | Commands to run                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- |
| TypeScript only       | `pnpm typecheck && pnpm build`                                                          |
| Prisma schema         | `pnpm db:generate && pnpm build`                                                        |
| Action registration   | `pnpm typecheck && pnpm build && pnpm test && pnpm docs:check`                          |
| API route change      | `pnpm typecheck && pnpm build && pnpm test`                                             |
| Auth/security change  | `pnpm typecheck && pnpm build && pnpm test`                                             |
| Webhook change        | `pnpm typecheck && pnpm build && pnpm --filter @tradeos/webhook-core test`              |
| AI-core change        | `pnpm typecheck && pnpm build && pnpm --filter @tradeos/ai-core test` (optionally eval) |
| Production/ops change | `pnpm typecheck && pnpm build && command-specific verification`                         |
| Documentation only    | `pnpm docs:check && review diff`                                                        |

### Final self-review

Before submitting:

1. Re-read the diff of every touched file
2. Check for any `console.log`, `as any`, `.catch(() => {})`, `require()` in source files
3. Verify error messages are in `ERROR_MESSAGES` with EN + VI
4. Verify `organizationId` is never hardcoded
5. Verify `mfaLevel` is always passed to `executeAction`
6. Verify the pre-commit hook would pass
7. Verify the CI pipeline would pass
8. State residual risks honestly — do not claim production readiness if known HIGH/CRITICAL issues remain

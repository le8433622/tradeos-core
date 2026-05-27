# Security and Tenancy — Production 10/10

## Core Security Rule

AI is not an admin. AI is an operator that must pass through policy.

## Tenant Isolation

Every tenant-owned object MUST carry or resolve to `organizationId`. No query may omit this filter unless explicitly authorized for cross-tenant operations.

```typescript
// GOOD
await prisma.lead.findMany({ where: { organizationId } });

// BAD — returns data from all orgs (CRITICAL)
await prisma.lead.findMany();
```

API routes MUST derive `organizationId` from the session, NEVER from untrusted request body. Use `stripSessionManagedFields()` to strip client-supplied org IDs.

### Multi-org queries

Use `OrganizationMember` join table, not `User.organizationId` (legacy field).

### Cross-org access

Verify the current user has an ACTIVE membership in that org, OR that data sharing is explicitly authorized via opt-in consent.

Invitation acceptance is the only token-bearer exception: `/invite/[token]` may resolve an `Invitation` by exact `tokenHash` before the accepting user has an organization membership. All follow-up writes still include `organizationId` and create an audit log.

## Auth Requirements

Production auth requirements:

- Supabase session resolution is REQUIRED
- `ALLOW_DEMO_AUTH=false` MUST be set in production
- Every protected API route MUST use `withApiSession()` or `withApiPermission()`
- Every protected page MUST call a page session resolver (`requirePageSession` / `requirePagePermission`)
- Role must be included in the server-side session context

### Auth flow

```
Authorization: Bearer <supabase_access_token>
  → Supabase auth.getUser(token)
  → user.email
  → Prisma User.email (via OrganizationMember)
  → organizationId + role + permissions + mfaLevel
  → tenant-scoped API execution
```

### Session resolution chain

```
requireSessionFromRequest(request)
  → parseBearerToken OR parseSupabaseCookies
  → getSessionAal(accessToken) → mfaLevel from JWT 'aal' claim
  → resolveSessionFromEmail(email, targetOrgId)
    → find OrganizationMember (ACTIVE) → role + permissions
    → fallback to legacy User.organizationId + User.role
  → return SessionContext
```

### Demo auth (local development only)

- Falls back to `demo-org` with role `OWNER`
- Always returns `mfaLevel: 'aal1'`
- Disabled in production via `ALLOW_DEMO_AUTH=false`

## API Error Boundary

Protected API routes MUST go through `withApiSession()` or `withApiPermission()` so auth, role, and tenant failures return controlled JSON errors:

| Error        | Status | Public Code                |
| ------------ | ------ | -------------------------- |
| No session   | 401    | AUTH_REQUIRED              |
| Wrong role   | 403    | ROLE_ACCESS_DENIED         |
| Wrong org    | 403    | ORGANIZATION_ACCESS_DENIED |
| MFA needed   | 403    | MFA_REQUIRED               |
| Server error | 500    | INTERNAL_ERROR             |

Unexpected failures MUST return `INTERNAL_ERROR` without stack traces. Server-side logs may include path, safe error code, and status only.

## Role Model

Current roles (6):

- `OWNER` — full access, risk settings, approvals, billing
- `ADMIN` — manage team, approve actions, moderation
- `SALES` — manage leads, quotations, products, contacts
- `OPERATOR` — process inbox, follow-ups, introductions
- `VIEWER` — read-only access to allowed tenant data
- `BUYER_REVIEWER` — external buyer reviewer, assigned reports and buyer-safe evidence only

Each role maps to a set of permission keys in the seed (`packages/database/prisma/seed.ts`).

Signup and invitation assignment rules:

- First user creating an organization becomes `OWNER` through `OrganizationMember.roleId = system-owner`.
- Invited users never choose organization or role. The invitation token fixes `organizationId` and `roleId`.
- Buyer-side reviewers should use `BUYER_REVIEWER`; they do not receive internal member permissions, raw evidence access, or org-wide sourcing access.
- Every request must resolve identity → organization → role → permission → object ownership; menu visibility is not an authorization boundary.

## AI Safety Gates

AI can suggest, draft, and create. AI CANNOT finalize high-risk trade decisions.

### AI allowed (direct execution):

- Create lead, follow-up task, company, contact
- Draft quotation
- Suggest partner
- Create/update product
- Ingest inbox message
- Draft notification
- Get AI budget status
- Track AI usage

### AI blocked (human approval required):

- Send quotation
- Propose/appove introduction
- Send bulk notification
- Invite user
- Update user role
- Anonymize PII
- Apply/remove legal hold
- Export privacy data
- Update billing plan
- Export billing data
- Change security settings
- Change introduction settings
- Create/approve report snapshot

## Input Validation

### Zod parsing is mandatory

Every API route body AND every registered action handler MUST validate input via Zod parsing. Current action packages use `safeParse(schema, input)`, which calls the exported Zod schema and maps validation failures to the stable `INVALID_REQUEST_BODY` error code.

Current status:

- crm-core, trade-core, inbox-core, and analytics-core action handlers parse inputs at handler entry.
- Key API routes use route-level schemas for create/update operations.
- Remaining work is regression coverage: add invalid-payload tests for each critical route/action path.

**Hard rule**: handlers must use `parsed` values after validation. Do not read raw `input` after parsing except for logging/error context.

### Validation helpers

`apps/web/lib/validate.ts` provides:

- `stripSessionManagedFields()` — removes `organizationId`/`orgId` from request body
- `checkPayloadSize()` — legacy header-only helper; webhook pipeline now performs actual body byte checks before JSON parsing
- `sanitizeString()` — strips HTML tags, limits to 5000 characters
- `sanitizeInput()` — applies sanitization to all string fields

## Webhook Security

### Public webhook routes (/api/webhooks/\*)

Must have:

1. Signature or shared secret verification
2. Idempotency key (event key)
3. Rate limiting
4. Provider-specific normalization
5. Failure recording
6. Replay protection where supported
7. Connection pooling with reasonable limits

### Webhook auth (NOT session-based)

Public webhooks receive requests from external providers (Zalo, WhatsApp, Email), NOT from logged-in users. These routes MUST use:

- `requireWebhookTenant()` for shared-secret routes
- `resolveWebhookTenantFromIntegration()` for integration-based routes
- NEVER `withApiPermission`, `withApiSession`, or `requireSessionFromRequest`

### Production mode

Provider webhooks MUST resolve tenant from `WebhookIntegration` registry in production. The legacy `x-organization-id` header fallback is disabled in production unless `ALLOW_WEBHOOK_ORG_HEADER=true` is explicitly set as a temporary, documented exception.

### Retry-idempotent processing

Webhook processing MUST avoid duplicating:

- Inbox messages: store `inboxId` before AI processing
- AI side effects: track processed event keys
- Worker state: recover stale RUNNING jobs

### Agent failure semantics

When `runTradeAgent` fails during webhook processing, the event must NOT be marked as `PROCESSED`. Current local code marks the event as `FAILED` with the agent error message. Remaining work: add a regression test asserting `runAgent` failure calls `markWebhookFailed` and does not call `markWebhookProcessed`.

### Webhook Integration Registry

Production tenant resolution uses `WebhookIntegration` instead of the caller-controlled header. Each channel has a unique `(channel, providerAccountId)` constraint. Secrets encrypted at rest with AES-256-GCM + `WEBHOOK_ENCRYPTION_KEY`. Setting `status` to `DISABLED` immediately stops processing.

## Secrets Management

Rules:

- No secrets in source code (CRITICAL)
- No secrets in committed docs
- No raw provider tokens in database unless encrypted and justified
- Environment variables ONLY for API keys
- Production secret changes require deployment notes

Required production env variables:

```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
ALLOW_DEMO_AUTH=false
WEBHOOK_SECRET
WEBHOOK_ENCRYPTION_KEY
HEALTHCHECK_SECRET
APP_URL
JWT_SECRET
OpenAI/OpenRouter API key
Provider secrets (ZALO_APP_SECRET, WHATSAPP_APP_SECRET, EMAIL_WEBHOOK_SECRET)
```

## Audit Requirements

Audit logs MUST capture:

- `organizationId` (from session)
- `actorUserId` (from session)
- `actionName` (dot-notation)
- `riskLevel` (from registered action)
- `input` (redacted via `redactForAudit`)
- `result` (redacted via `redactForAudit`)
- `approved` (boolean)
- `timestamp` (auto)

### Transactional contract

Registered action mutation + audit log write MUST succeed or fail together. `executeAction` wraps handler + audit write inside `prisma.$transaction`. Action handlers receive `context.prismaTransactionClient` and MUST use it via `db(context)`.

Blocked actions (org mismatch, role denied, MFA required): audit log is written outside the transaction (best-effort).

### MFA audit (KNOWN GAP)

- Every MFA/role/org block writes an audit log with `approved: false`.
- Current code writes structured JSON in `result.reason` and `result.blockReason`.
- There is no dedicated `blockReason` DB column. Add one only if audit analytics needs indexed querying.

### Role ID ownership

`user.roleUpdate` and `user.invite` validate that a provided `roleId` exists and is either a system role or belongs to the current organization. Cross-tenant custom role assignment must be rejected with `INVALID_ROLE`.

### MFA enforcement matrix

| Condition                              | Check                 | Block if        |
| -------------------------------------- | --------------------- | --------------- |
| Action in ALWAYS_REQUIRE_MFA_ACTIONS   | `mfaLevel === 'aal2'` | Not aal2        |
| Action HIGH/CRITICAL + org.mfaRequired | `mfaLevel === 'aal2'` | Not aal2        |
| Action LOW/MEDIUM (not in always set)  | No check              | N/A             |
| context.organizationId undefined       | Skipped               | N/A (edge case) |

### Audit redaction

Before writing `input` or `result`, sensitive fields are redacted:

- Keys: `password`, `secret`, `token`, `apiKey`, `authorization`, `creditCard`, `ssn`, `taxId` → `[REDACTED]`
- Emails: `alice@example.com` → `a***e@example.com`
- Phones: `+84912345678` → `+84*****5678`
- Recursive up to 10 levels, arrays processed individually

## Production Operations Guardrail

This repository may be connected to production GitHub, Supabase, Vercel, and Cloudflare accounts. Agents MUST NOT perform these without an explicit production-ops task:

- Push commits or tags
- Create or merge PRs
- Deploy production
- Run production migrations
- Change DNS, WAF, cache, workers, or page rules
- Purge caches
- Rotate secrets
- Delete production data

Before any production operation, document:

- Target environment (URL, project ID)
- Exact command
- Expected effect
- Rollback path
- Verification step
- Record result in checkpoint

## Cross-Tenant Data Sharing

No data crosses tenant boundaries unless the tenant explicitly opts in.

### Opt-in levels

1. **Aggregate only (default)** — contributes to anonymous summaries
2. **Profile visible** — company name, industry, country, products visible to other opted-in tenants
3. **Introduction ready** — association operator can propose introductions

Contact details and workflow data (leads, quotations, conversations) are ALWAYS private regardless of opt-in level. Opt-in/opt-out changes are audited.

## Sensitive Exports and Health

- Privacy export (`privacy.export`): registered action, AAL2 MFA, audit with summary/count only
- Billing export (`billing.export`): registered action, AAL2 MFA, audit with summary/count only
- Deep health (`/api/health/deep`): requires `HEALTHCHECK_SECRET` in production, returns component status without tenant data

## Incident Principles

If a security issue is discovered:

1. Do NOT hide it with broad fallback behavior
2. Stop risky execution paths
3. Document affected files and behavior
4. Prefer disabling through env flags, policy gates, provider disablement, or deployment rollback
5. NEVER fix by deleting tenant data unless explicitly approved and backed up
6. Record the incident in `docs/22_INCIDENT_RESPONSE.md`

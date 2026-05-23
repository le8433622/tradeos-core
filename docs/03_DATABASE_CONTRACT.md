# Database Contract

## Global Rules

1. Every tenant-owned table must include `organizationId` unless tenant scope is guaranteed through a parent relation and documented.
2. Every tenant-scoped query must include `organizationId` or join through a parent that is already scoped by `organizationId`.
3. Do not store secrets in source code or database rows.
4. Use `metadata Json` for flexible provider-specific data, not reporting-critical fields.
5. Add explicit columns for values needed in dashboards, filters, reports, approvals, or billing.
6. Add indexes for common tenant queries before scale requires emergency migration.
7. Avoid destructive deletes for customer data; prefer status, archive, or soft-delete patterns when production data exists.
8. After schema changes, run `pnpm db:generate` and `pnpm build`.

## Tenant Ownership Matrix

Tenant-owned directly:

- `User`
- `Company`
- `Lead`
- `Product`
- `Conversation`
- `Task`
- `Quotation`
- `Notification`
- `AuditLog`
- `ApprovalRequest`
- `WebhookEvent`

Tenant-scoped through parent in current schema:

- `Contact` through `Company`
- `Message` through `Conversation`
- `Deal` through `Company` or `Lead`

If a tenant-scoped-through-parent model needs independent list pages, filters, exports, permissions, or analytics, add `organizationId` directly.

## Required Query Pattern

Good:

```ts
await prisma.lead.findMany({
  where: { organizationId },
  orderBy: { createdAt: "desc" },
});
```

Bad:

```ts
await prisma.lead.findMany();
```

For nested tenant scope:

```ts
await prisma.message.findMany({
  where: {
    conversation: { organizationId },
  },
});
```

## Index Guidelines

Prefer these patterns for tenant-owned tables:

- `@@index([organizationId, createdAt])`
- `@@index([organizationId, status])`
- `@@index([organizationId, updatedAt])`
- `@@unique([organizationId, channel, eventKey])` for webhook idempotency
- `@@unique([organizationId, provider, externalId])` for future integrations

## Migration Discipline

Before migration:

1. Confirm whether production data exists.
2. Identify backward compatibility impact.
3. Prefer additive migrations when production data exists.
4. Document data backfill needs.
5. Document rollback limitations.

After editing Prisma schema:

1. Run `pnpm db:generate`.
2. Run `pnpm build`.
3. If creating a real migration, run it only against the intended environment.
4. Update `docs/13_CHECKPOINTS.md` with migration notes.

## Production Database Operations

Agents must not run production Supabase migrations unless the task explicitly says to do so.

Required production migration notes:

- target project/environment
- migration command
- expected tables/columns/indexes affected
- data backfill plan
- rollback or forward-fix plan
- verification queries

## JSON And PII

Allowed in `metadata`:

- external provider payload fragments
- extraction confidence
- source-specific IDs
- non-core experimental fields

Avoid in `metadata`:

- API keys
- raw access tokens
- payment secrets
- fields needed for dashboards or filtering

PII handling:

- Keep customer contact fields role-aware in UI.
- Do not export PII without an explicit export workflow.
- Do not feed unnecessary PII into AI prompts.

## Deletion Policy

Low-risk deletion examples:

- deleting unsent local draft artifacts without customer impact

High-risk deletion examples:

- deleting leads
- deleting companies
- deleting contacts
- deleting conversations
- deleting quotations
- deleting audit logs

High-risk deletion requires:

- owner/admin role
- approval path when initiated by AI or bulk workflow
- audit log
- clear UI confirmation
- recovery or archive strategy when possible

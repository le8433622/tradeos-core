# Cloud DB Safety Protocol — Supabase + Prisma + Vercel Preview

**Date**: 2026-05-26
**Status**: Active
**Issue**: #48
**Purpose**: prevent schema drift, shared-state pollution, and production/preview database incidents.

## 1. Environment Inventory

| Resource           | Status                                         | Risk Level |
| ------------------ | ---------------------------------------------- | ---------- |
| Supabase Project   | Single shared instance                         | HIGH       |
| Supabase Branching | NOT configured                                 | HIGH       |
| Vercel Production  | `tradeos-core.vercel.app`                      | HIGH       |
| Vercel Preview     | Auto-deployed per push/PR                      | HIGH       |
| CI (GitHub)        | No DB connection; fake `DATABASE_URL` in build | SAFE       |
| Local Dev          | Uses root `.env` with shared Supabase creds    | MEDIUM     |
| E2E Tests          | Env-gated (`E2E_RUN_ENABLED`); no CI run       | MEDIUM     |

### 1.1 Shared DB Risk

The Supabase project is a **single shared database** used by:

- Local development (`DATABASE_URL` in root `.env`)
- Vercel production deployment
- Vercel preview deployments
- All PR branches

There is no per-branch or per-preview DB isolation. Any schema change, test write, or E2E run affects the same database that production reads from.

### 1.2 Ci Build Safety

The CI `build` job uses a fake localhost URL:

```
DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/tradeos_test"
```

This means the CI build does NOT connect to Supabase. Typecheck, build, and Prisma Client generation are safe. The CI pipeline does not run migrations, tests against real DB, or E2E.

## 2. Prisma Schema & Migration Safety

### 2.1 Forbidden Operations on Shared DB

These commands must **never** be run against the shared Supabase database:

| Command                   | Reason                                                   |
| ------------------------- | -------------------------------------------------------- |
| `prisma db push`          | Bypasses migration history; can destroy data/enum values |
| `prisma migrate dev`      | Creates shadow DB; mutates schema directly               |
| `prisma migrate reset`    | Destroys all data                                        |
| `prisma db seed`          | Writes to shared DB; pollutes production data            |
| `prisma migrate deploy`   | Only allowed in controlled production deployment         |
| Direct SQL `DROP`/`ALTER` | No audit trail; can corrupt production                   |

### 2.2 Required Schema Change Workflow

Every schema change must follow this sequence:

```
1. Edit packages/database/prisma/schema.prisma
2. Run pnpm db:generate (generates Prisma Client locally)
3. Create migration file in packages/database/prisma/migrations/
4. Run pnpm typecheck (all packages)
5. Run pnpm docs:check
6. Run pnpm build
7. Create PR with migration file included
```

Migration files are created using:

```bash
prisma migrate diff --from-migrations prisma/migrations \
  --shadow-database-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<name>/migration.sql
```

Or manually if the shadow DB is unavailable.

### 2.3 Migration Application

`prisma migrate deploy` is only allowed:

- During controlled production deployment
- After CI passes all gates (typecheck, build, test, lint, docs-check)
- After PR is reviewed and merged
- Never from a preview/PR branch

### 2.4 Pre-Merge Gates

No schema PR may be merged unless:

- `pnpm db:generate` passes
- `pnpm typecheck` passes (all packages)
- `pnpm docs:check` passes
- Migration file exists in the PR
- No `db push`, `migrate dev`, or `migrate reset` was run against shared DB
- Build passes (`pnpm build`)
- Agent confirms: "I did not run any schema mutation against the shared Supabase DB"

## 3. E2E & Test Data Isolation

### 3.1 Required Scoping

Every online write test or E2E test that touches a real database MUST use:

1. **`E2E_RUN_ID`**: unique per test run (timestamp or UUID)
2. **`organizationId`**: all writes scoped to a known test tenant
3. **Data prefix**: `e2e-<runId>-` on all created records (where applicable)
4. **Cleanup scoped by**: `E2E_RUN_ID + organizationId` only
5. **No global unscoped** `deleteMany` / `updateMany`

### 3.2 Forbidden Patterns

```typescript
// FORBIDDEN: global unscoped delete
await prisma.sourcingRun.deleteMany();

// FORBIDDEN: unscoped update
await prisma.sourcingRun.updateMany({ data: { status: "DRAFT" } });
```

### 3.3 Required Patterns

```typescript
// REQUIRED: scoped to test tenant + run
await prisma.sourcingRun.deleteMany({
  where: {
    organizationId: E2E_TEST_ORG_ID,
    title: { startsWith: `e2e-${E2E_RUN_ID}` },
  },
});
```

### 3.4 E2E Run Gate

Before any E2E run with online writes:

- `E2E_RUN_ENABLED` must be `"true"`
- `E2E_BASE_URL` must be set
- Agent must confirm the DB is an isolated instance, not shared production
- If isolated DB is unavailable, E2E writes must be skipped

## 4. Vercel / Supabase Connection Safety

### 4.1 Current State

- **Production**: uses `DATABASE_URL` from Vercel env vars → Supabase
- **Preview**: uses same `DATABASE_URL` → same Supabase pool
- **Build**: `db:generate` only (safe, does not connect to DB)

### 4.2 Serverless Pool Guardrails

Given shared Supabase connection pools:

```typescript
// FORBIDDEN: unbounded queries in production code paths
await prisma.sourcingRun.findMany(); // no take/limit

// FORBIDDEN: N+1 in hot paths
for (const run of runs) {
  await prisma.supplierCandidate.findMany({ where: { sourcingRunId: run.id } });
}

// REQUIRED: paginated, limited queries
await prisma.sourcingRun.findMany({
  take: 50,
  orderBy: { createdAt: "desc" },
});
```

### 4.3 Connection String Rules

- `DATABASE_URL`: pooled connection (PgBouncer) for runtime queries
- `DIRECT_URL`: direct connection for migrations only
- Never hardcode credentials in source code
- All credentials must come from environment variables
- `.env` files must be in `.gitignore` (verified: root `.env` IS gitignored)

### 4.4 Preview vs Production Risk

Preview and production share the same Supabase database. Therefore:

- Preview deployments can read production data
- Preview deployments can mutate production data if POST/PUT/DELETE routes are hit
- There is no environment-level isolation

Mitigation: auth middleware and `organizationId` scoping provide application-level isolation but not infrastructure-level.

## 5. Deploy Trigger Safety

### 5.1 Current State

**Vercel auto-deploys** on every push to `main`. The build command runs:

```
pnpm --filter @tradeos/database db:generate && pnpm --filter @tradeos/web build
```

This is safe because:

- `db:generate` only generates Prisma Client (no DB connection)
- No migration is run during build/deploy
- No `prisma migrate deploy` is in the build command

### 5.2 Verified Triggers

| Trigger        | Status         | Safe?                          |
| -------------- | -------------- | ------------------------------ |
| GitHub CI      | PR + push main | Yes (no DB connect)            |
| Vercel deploy  | Push main      | Yes (only db:generate + build) |
| Vercel preview | Per PR         | Yes (same build script)        |

### 5.3 No Deploy Hook Found

No custom deploy trigger webhook or file found outside of standard Vercel + GitHub integration. If a webhook is added later, it must:

1. Run only after CI passes
2. Never run `prisma migrate deploy` automatically
3. Have a rollback path

## 6. Agent Safety Rules

### 6.1 Absolute Prohibitions

When working on this repo, AI/code agents must **NEVER**:

1. Run `prisma db push` against any online/supabase DB
2. Run `prisma migrate dev` against shared Supabase
3. Run `prisma migrate reset` for any reason
4. Run `prisma db seed` against shared Supabase
5. Execute raw SQL writes against shared Supabase
6. Run E2E tests with real writes without isolated DB or `E2E_RUN_ID`
7. Delete or update records without `organizationId` scope
8. Run deploy commands manually without documented rollback
9. Claim production readiness without migration safety proof

### 6.2 Pre-Merge Confirmation

Before any PR that changes `schema.prisma`, the agent must confirm:

```
[x] db:generate ran locally
[x] typecheck passes all packages
[x] docs:check passes
[x] build passes
[x] No prisma db push was run against shared DB
[x] No prisma migrate dev was run against shared DB
[x] Migration file exists in PR
[x] E2E writes were not performed against shared DB
```

### 6.3 Stop Conditions

Stop immediately if:

- A DB command would mutate the shared Supabase DB
- Migration requires DB access that is unavailable
- E2E would write to production/shared DB without isolation
- `DATABASE_URL` or `DIRECT_URL` is unavailable and needed for a schema operation
- An operation requires `prisma db push` to proceed

## 7. Recovery Procedures

### 7.1 If db push was accidentally run

1. Stop all writes immediately
2. Compare current DB schema against `prisma/schema.prisma`
3. Generate the correct migration from the schema diff
4. Apply missing migrations via `prisma migrate deploy`
5. Verify with `prisma migrate status`
6. Do NOT run `prisma migrate reset`

### 7.2 If test data leaked to production

1. Identify the `E2E_RUN_ID` or run prefix
2. Delete only records matching that prefix AND the test `organizationId`
3. Verify tenant isolation is intact
4. Document the leak and fix the isolation gap

### 7.3 If migration race detected

1. Stop deploying both PRs
2. Identify which PR was merged first
3. Rebase the later PR on the merged main
4. Regenerate migration from the correct base
5. Verify with `prisma migrate diff`

## 8. Verification Checklist

Run these commands before merging any schema-change PR:

```bash
pnpm db:generate        # must pass
pnpm typecheck          # must pass
pnpm docs:check         # must pass
pnpm build              # must pass
```

For migration safety:

```bash
# Count schema models match expected
grep "^model " packages/database/prisma/schema.prisma | wc -l

# Verify no db push was run recently (check migration history)
ls packages/database/prisma/migrations/
```

## 9. Documentation References

- `docs/SUPER_AGENT_RULER.md` — agent stop conditions
- `docs/13_CHECKPOINTS.md` — production readiness ledger
- `docs/CURRENT_TRUTH.md` — live state
- `docs/32_SUPPLIER_SWITCH_EXECUTION_PROTOCOL.md` — implementation chain
- `docs/20_DEVELOPER_ONBOARDING.md` — developer setup (needs update)

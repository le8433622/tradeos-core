# Developer Onboarding Manual

## Prerequisites

- **Node.js 20.x** (use `nvm` or `fnm` to manage versions)
- **pnpm** 9.x+ (enable via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
- **Supabase** account (local or hosted) with a project
- **PostgreSQL 15+** if running Supabase locally

## Quick Start

```bash
# 1. Clone and enter the monorepo
git clone <repo-url> tradeos-core
cd tradeos-core

# 2. Install dependencies
corepack enable   # only needed once
pnpm install

# 3. Copy environment template
cp apps/web/.env.example apps/web/.env.local

# 4. Set up database
pnpm db:generate   # generate Prisma client

⚠️ **IMPORTANT**: Do NOT run `pnpm db:push` — this project uses Prisma migrations, not push. `db:push` bypasses migration history and can corrupt the shared Supabase database. See `docs/33_CLOUD_DB_SAFETY_PROTOCOL.md` for full rules.

# 5. Start development
pnpm dev           # starts Next.js on http://localhost:3000
```

### Environment Variables

Edit `apps/web/.env.local` with your local Supabase project values:

| Variable                        | Required        | Description                           |
| ------------------------------- | --------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes             | Supabase project URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes             | Supabase anonymous key                |
| `DATABASE_URL`                  | Yes             | PostgreSQL connection string          |
| `ALLOW_DEMO_AUTH`               | Dev only        | Set `true` for local dev              |
| `OPENAI_API_KEY`                | No (AI feature) | OpenAI API key                        |
| `WORKER_ENABLED`                | No              | Enable async webhook processing       |
| `LOG_LEVEL`                     | No              | One of: `debug` `info` `warn` `error` |

## Architecture Reading Path

Read these docs **in order** for a complete mental model:

1. **`docs/00_PRODUCT_MANIFESTO.md`** — What TradeOS is and isn't. North star. Marketplace-later rule.
2. **`docs/01_ARCHITECTURE.md`** — Monorepo structure, data flow, mutation patterns, agent loop.
3. **`docs/02_DOMAIN_MODEL.md`** — Core entities and their relationships.
4. **`docs/06_SECURITY_AND_TENANCY.md`** — Tenant isolation, auth flow, session resolution. **Read before writing any route.**
5. **`docs/04_ACTION_REGISTRY.md`** — How mutations happen through registered actions. AI vs manual paths.
6. **`docs/05_AI_AGENT_CONTRACT.md`** — What AI can and cannot do. Plan format. Fallback behavior.
7. **`docs/03_DATABASE_CONTRACT.md`** — Prisma conventions, migration discipline, query patterns.
8. **`docs/12_TASK_PLAN.md`** — How tasks are structured. Agent protocol.
9. **`docs/16_EXECUTIVE_TASK_PLAN.md`** — Production-readiness program. Current and upcoming work.
10. **`docs/20_DEVELOPER_ONBOARDING.md`** — This file. Recipes and safety rules.

## Package Map

| Package                   | Owns                                                     | Dependencies                               |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `apps/web`                | Next.js App Router, API routes, UI pages                 | All `@tradeos/*` packages                  |
| `apps/worker`             | Background job processing                                | `job-core`, `webhook-core`, `ai-core`      |
| `packages/database`       | Prisma schema + client export                            | None                                       |
| `packages/auth`           | Supabase session resolution, demo auth                   | `database`                                 |
| `packages/policy-core`    | Action registry, role gates, audit writes, executeAction | `database`                                 |
| `packages/approval-core`  | Approval lifecycle (create, approve, execute, reject)    | `database`, `policy-core`                  |
| `packages/ai-core`        | LLM plan, intent detection, trade agent                  | `policy-core`, `approval-core`, `database` |
| `packages/crm-core`       | Lead, contact, company registered actions                | `policy-core`, `database`                  |
| `packages/trade-core`     | Quotation, product, partner actions                      | `policy-core`, `database`                  |
| `packages/inbox-core`     | Message/conversation ingestion                           | `database`                                 |
| `packages/webhook-core`   | Webhook verification, event storage, tenant resolution   | `database`                                 |
| `packages/job-core`       | Queue: enqueue, claim, complete, fail, backoff           | `database`                                 |
| `packages/analytics-core` | Dashboard metrics, weekly reports, snapshots             | `database`                                 |

## Common Task Recipes

### Add An API Route

1. Create file at `apps/web/app/api/<resource>/route.ts` (or `apps/web/app/api/<resource>/[id]/<action>/route.ts` for nested routes).
2. Import `withApiSession` from `../../lib/api-errors` (adjust `../` depth to match).
3. Use roles: `['OWNER', 'ADMIN']` for write routes; `['OWNER', 'ADMIN', 'SALES', 'OPERATOR']` for read routes.
4. Wrap handler body in `try/catch` with `apiErrorResponse`.
5. Always use `session.organizationId` — never accept `organizationId` from request body.
6. Example:

```typescript
import { NextResponse } from "next/server";
import { apiErrorResponse, withApiSession } from "../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiSession(request, ["OWNER", "ADMIN"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    // session.userId, session.organizationId, session.role, session.email
    return NextResponse.json({ data: "ok" });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
```

7. Build: `pnpm build` (compiles all packages + Next.js).

### Add A Registered Action

1. Open the appropriate package: `crm-core`, `trade-core`, or create a new `packages/*-core`.
2. Define input and output types.
3. Call `registerAction<Input, Output>({ name, description, riskLevel, allowedRoles, requiresApprovalForAI, handler })`.
4. Export the action for testability.
5. Import the package as a side-effect in `packages/ai-core/src/index.ts` so actions are registered before AI agent runs:

```typescript
import "@tradeos/your-package";
```

6. Add action to the `ALLOWED_ACTIONS` list in `packages/ai-core/src/llm.ts` if AI should be able to propose it.
7. Build and verify: `pnpm build`.

### Add A Prisma Field

1. Edit `packages/database/prisma/schema.prisma`.
2. Run `pnpm db:generate` to regenerate the Prisma client.
3. Run `pnpm build` to verify compilation.
4. **Migration is not automatic** — you need `pnpm db:push` for local dev or a `prisma migrate dev` for production schema changes.

### Add A Webhook Provider

1. Add provider channel to `ChannelType` enum in schema.prisma if new.
2. Create route at `apps/web/app/api/webhooks/<provider>/route.ts`.
3. Import webhook-core helpers for signature verification and tenant resolution.
4. Add `verify<Provider>Signature` function to `packages/webhook-core/src/index.ts`.
5. Add `extract<Provider>ProviderAccountId` to extract the caller's identity.
6. Use `receiveWebhookEvent` → `enqueueJob('PROCESS_WEBHOOK_EVENT', ...)` pattern.
7. Add worker processor for the new channel in `apps/worker/src/processors/webhook.ts`.

## Security Rules: Never Do This

### Never trust user-supplied `organizationId`

```typescript
// ❌ WRONG — attacker can read any tenant's data
const { organizationId } = await request.json();
return prisma.lead.findMany({ where: { organizationId } });

// ✅ CORRECT — always use session
const { session } = await withApiSession(request);
return prisma.lead.findMany({
  where: { organizationId: session.organizationId },
});
```

### Never accept `organizationId` in POST body for session-scoped routes

```typescript
// ❌ WRONG — body can override session org
const body = await request.json();
return createLead({ ...body, organizationId: body.organizationId });

// ✅ CORRECT — strip body orgId, use session
const { organizationId } = session;
return createLead({ ...body, organizationId });
```

The `stripSessionManagedFields` helper in `apps/web/lib/validate.ts` automatically strips `organizationId` and `orgId` from POST bodies.

### Never expose raw secrets or stacks

```typescript
// ❌ WRONG — leaks internal state
catch (error) {
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
}

// ✅ CORRECT — safe error path
catch (error) {
  return apiErrorResponse(request, error);  // logs server-side, returns controlled JSON
}
```

### Never write directly to the database

All mutations must go through `executeAction()` or `registerAction()`. Exceptions:

- Audit log writes (inside policy-core)
- Webhook event persistence (inside webhook-core)
- Job queue operations (inside job-core)

### Never bypass tenant scope

```typescript
// ❌ WRONG — finds record without tenant check
const lead = await prisma.lead.findUnique({ where: { id } });

// ✅ CORRECT — scoped to tenant
const lead = await prisma.lead.findFirst({
  where: { id, organizationId: session.organizationId },
});
```

### Never commit secrets

- No API keys, secrets, or tokens in source code
- No `.env.local` in Git (covered by `.gitignore`)
- No hardcoded credentials in tests or fixtures
- Use environment variables for all configuration

## Troubleshooting

### `pnpm build` fails with type errors

```bash
pnpm db:generate   # regenerate Prisma client if schema changed
pnpm build         # retry
```

### `prisma generate` fails

Check that `DATABASE_URL` is set and the database is running.

### Webhook routes return 500

1. Check `apps/web/.env.local` has the required webhook secrets.
2. Check logs for `WEBHOOK_SECRET_INVALID` or `WEBHOOK_SECRET_NOT_CONFIGURED`.
3. Ensure `WEBHOOK_SECRET` is set in production, or the route will fail closed.

### Worker not processing jobs

1. Set `WORKER_ENABLED=true` in env.
2. Run `pnpm dev:worker` separately.
3. Check `Job` table in the database — status should show `PENDING`.

### AI not working

1. Ensure `OPENAI_API_KEY` is set.
2. Check `LOG_LEVEL=debug` to see LLM request/response logs.
3. Fallback to `planTradeAgent()` (keyword detection) works without AI key.

## Testing

### Unit tests

```bash
pnpm test                                    # all packages
pnpm --filter @tradeos/policy-core test      # 21 tests
pnpm --filter @tradeos/approval-core test    # 6 tests
pnpm --filter @tradeos/ai-core test          # 48 tests
pnpm --filter @tradeos/job-core test         # 12 tests
```

Tests are written with [Vitest](https://vitest.dev/) (v4). Test files live in `src/__tests__/` within each package.

### Integration tests

```bash
RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test
```

Requires a real local/staging database. Skipped when `RUN_INTEGRATION_TESTS` is not `true`.

### E2E tests

Browser-level E2E tests in `apps/web/e2e/` using [Playwright](https://playwright.dev/).

```bash
# First-time setup
pnpm --filter @tradeos/web exec playwright install chromium

# Run (starts dev server automatically)
E2E_RUN_ENABLED=true pnpm --filter @tradeos/web test:e2e
```

All tests skip with clear message when `E2E_RUN_ENABLED` is not `true`. Uses demo auth — no real login needed for local testing.

## Getting Help

- Architecture / design decisions: read `docs/ADR/*.md`
- Task status / what to work on next: read `docs/13_CHECKPOINTS.md`
- Incident response: `docs/15_OBSERVABILITY.md` (on-call thresholds, recovery playbooks)
- Data retention: `docs/18_DATA_RETENTION.md`
- Data inventory and PII: `docs/19_DATA_INVENTORY.md`

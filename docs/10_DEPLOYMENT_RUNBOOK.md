# Deployment Runbook — Production Readiness

## Current Truth

TradeOS Core is not production 10/10 yet. This runbook defines the gates required before production, but it does not prove those gates have passed.

As of 2026-05-23:

- Local typecheck/tests/web build have passed in recent runs, but issue #1 T0 fixes must be implemented and re-verified.
- `pnpm docs:check` checks action-name and metadata parity.
- GitHub CI was observed green on `main`; issue #1 route/action parity is now implemented locally and needs remote CI proof on the next run.
- Branch protection has not been enabled.
- Supabase staging migration has not been verified with existing data.
- A Vercel preview URL was recorded, but the full `docs/20_STAGING_SMOKE_TESTS.md` checklist still needs evidence.

No production deploy should be attempted until `docs/13_CHECKPOINTS.md` shows no HIGH or CRITICAL open blockers.

## Production Ops Guardrail

This repository may be logged into real GitHub, Supabase, Vercel, and Cloudflare CLIs. Do NOT run production-impacting commands unless the current task explicitly requires production operations AND you have received explicit user confirmation for each operation.

Production-impacting commands include:

- `git push` to main/production branch
- `gh pr create` / `gh pr merge`
- `vercel --prod`
- Supabase migration commands against production (`supabase db push` / `npx prisma migrate deploy` against production DB)
- Cloudflare DNS/WAF/cache/worker changes (`wrangler`, `curl -X PATCH` to CF API)
- Secret rotation (change env vars in Supabase, Vercel, Cloudflare)
- Tenant data deletion (DELETE endpoints, DB truncate, prune operations)

## Environments

| Environment       | Purpose                   | Supabase Project                         | Vercel            | Notes                   |
| ----------------- | ------------------------- | ---------------------------------------- | ----------------- | ----------------------- |
| Local development | Daily development         | Local Docker or staging project          | N/A               | Demo auth enabled       |
| Vercel preview    | PR review                 | Staging project                          | Automatic per PR  | `ALLOW_DEMO_AUTH=true`  |
| Staging           | Pre-production validation | Staging project (`ulnjanlaehfmxurreibj`) | Staging domain    | `ALLOW_DEMO_AUTH=false` |
| Production        | Live service              | Production project                       | Production domain | `ALLOW_DEMO_AUTH=false` |

Do NOT mix staging and production database URLs.

## Supabase Projects

### Staging

- Organization: TradeOS AI
- Project: TradeOS Core Staging
- Project ref: `ulnjanlaehfmxurreibj`
- Region: ap-southeast-2
- Database host: `db.ulnjanlaehfmxurreibj.supabase.co`
- Pooler host: `aws-0-ap-southeast-2.pooler.supabase.com`

### Production

- (Define when production project is created)

## Required Environment Variables

### Core

```
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@pooler-url:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@db-url:5432/postgres"
APP_URL="<DEPLOYMENT_URL>"
JWT_SECRET="<strong-secret>"
```

### Supabase

```
NEXT_PUBLIC_SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
ALLOW_DEMO_AUTH="false"
```

### Webhooks

```
WEBHOOK_SECRET="<strong-secret>"
WEBHOOK_ENCRYPTION_KEY="<aes-256-gcm-key>"
ZALO_APP_SECRET="<zalo-secret>"
WHATSAPP_APP_SECRET="<whatsapp-secret>"
EMAIL_WEBHOOK_SECRET="<email-secret>"
ALLOW_WEBHOOK_ORG_HEADER=""        # Must stay unset/false in production
```

### Operations

```
HEALTHCHECK_SECRET="<ops-secret>"
```

### AI

```
OPENAI_API_KEY="<openai-key>"      # Or OPENROUTER_API_KEY
OPENROUTER_API_KEY="<openrouter-key>"
```

### Worker

```
WORKER_ENABLED="true"
REDIS_URL="<optional-redis-url>"
```

## Local Build Commands

```bash
pnpm install
pnpm db:generate
pnpm build
pnpm --filter @tradeos/web dev
pnpm dev:worker        # Separate terminal, optional
```

## Preview Deployment Checklist

1. Confirm environment variables in Vercel preview point to STAGING Supabase
2. Clean build:
   ```bash
   pnpm install && pnpm db:generate && pnpm build
   ```
3. Run all checks:
   ```bash
   pnpm db:generate && pnpm typecheck && pnpm test && pnpm build && pnpm docs:check && pnpm lint && pnpm license:check && git diff --check
   ```
   Also run `pnpm routes:check`.
4. Run DB-backed integration tests against staging/local DB:
   ```bash
   RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test
   ```
5. Deploy to Vercel preview (automatic on PR push)
6. Complete `docs/20_STAGING_SMOKE_TESTS.md` and record evidence in `docs/13_CHECKPOINTS.md`
7. Validate:
   - [ ] `/api/health` returns 200
   - [ ] Login with test credentials succeeds
   - [ ] Tenant dashboard loads with correct org data
   - [ ] Lead creation succeeds
   - [ ] Audit log written for safe mutation
   - [ ] Approved webhook request succeeds
   - [ ] Unsigned webhook request returns 401

## Production Deployment Sequence

### Before deploy (24h freeze recommended)

1. [ ] Confirm task explicitly authorizes production deploy
2. [ ] Inspect git status and diff — no secret in diff
3. [ ] Check `ALLOW_DEMO_AUTH=false` in production env vars
4. [ ] Review all migration SQL files against current schema
5. [ ] Verify rollback path for each migration
6. [ ] Take Supabase production DB backup (or verify automatic backup)
7. [ ] Verify Vercel build successfully locally

### Deploy sequence

1. **Database migration** (if required):

   ```bash
   pnpm db:migrate  # or npx prisma migrate deploy against production DATABASE_URL
   ```

   - [ ] Migration applied successfully
   - [ ] Verification queries pass
   - [ ] Rollback SQL ready

2. **Prisma client generation**:

   ```bash
   pnpm db:generate
   ```

   - [ ] Client regenerated

3. **Vercel production deploy**:
   Push to main branch → Vercel auto-deploys OR `vercel --prod`

4. **Production verification**:
   - [ ] `/api/health` returns 200
   - [ ] `/api/health/deep` returns component status (with HEALTHCHECK_SECRET)
   - [ ] Login with real user credentials succeeds
   - [ ] Tenant dashboard loads with correct org data
   - [ ] Lead or test mutation succeeds → audit log written
   - [ ] HIGH-risk action requires MFA or approval (as appropriate)
   - [ ] Signed webhook request processed
   - [ ] Unsigned webhook request rejected (401)
   - [ ] Duplicate webhook idempotent (200, no duplicate inbox)

5. **Record deployment notes** in `docs/13_CHECKPOINTS.md`

### After deploy (observability window — 2 hours)

- [ ] Monitor error rates (Vercel dashboard, logs)
- [ ] Monitor job queue depth (dashboard/metrics)
- [ ] Monitor webhook failure rate
- [ ] If issues detected → rollback or disable feature

## Migration Safety

### Current migration caveat

The local `20260522_deal_orgid` migration has been edited to add `Deal.organizationId` safely (nullable → backfill → NOT NULL). This is acceptable only if that migration has not been applied to any shared/staging/production database.

Before staging or production deploy:

1. Inspect the target database migration history.
2. If the original unsafe migration was already applied, do NOT rely on edited local history. Create a forward-only corrective migration instead.
3. Validate with existing Deal rows, not only an empty database.
4. Record verification queries and results in `docs/13_CHECKPOINTS.md`.

### Before every migration

1. Identify target Supabase project (staging vs production)
2. Confirm `DATABASE_URL` and `DIRECT_URL` point to the intended project
3. Read migration SQL — understand every ALTER/CREATE/DROP
4. Identify affected tables and approximate row counts
5. Define verification queries (SELECT counts, check constraints)
6. Define rollback plan (forward-fix preferred over destructive revert)

### Unsafe migration patterns

| Pattern                                               | Why it's unsafe                    | Fix                                                       |
| ----------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `ALTER TABLE ADD COLUMN col NOT NULL` without DEFAULT | Fails if table has existing rows   | Add as nullable first, backfill, then NOT NULL            |
| DROP COLUMN with data dependency                      | Loses data, breaks queries         | Add deprecation notice first, migrate readers, drop later |
| RENAME COLUMN without updating code                   | Runtime errors until code deployed | Add new column, dual-write, migrate readers, remove old   |
| DROP TABLE with foreign keys                          | Cascade deletes unrelated data     | Verify all FK relations, archive before drop              |

### Rollback strategy

Preferred order:

1. Disable feature through env flag or policy gate
2. Disable webhook provider or route (set `WebhookIntegration.status = DISABLED`)
3. Roll back Vercel deployment (Vercel dashboard → previous deployment → promote)
4. Revert Cloudflare rule
5. Apply database forward-fix migration (add column back, set defaults)
6. Use data rollback ONLY with explicit backup and approval

Never rollback by deleting tenant data.

## Vercel Configuration

### Current setup

- Project: `tradeos-core`
- Project ID: `prj_3b4Eg8YpEvztpNpCxRMm2sgj8utj`
- Framework: Next.js
- Root Directory: `.`
- Build Command: `pnpm --filter @tradeos/database db:generate && pnpm --filter @tradeos/web build`
- Install Command: `npm install -g pnpm@10.11.0 && pnpm install --registry=https://registry.npmjs.org/`
- Output Directory: `.next`
- Node Version: 20.x

### Known build issues

| Issue                      | Root cause                    | Fix                        |
| -------------------------- | ----------------------------- | -------------------------- |
| `ERR_PNPM_META_FETCH_FAIL` | pnpm registry timeout         | Pinned pnpm to 10.11.0     |
| `ERR_INVALID_THIS`         | Node version mismatch         | Pinned Node to 20.x        |
| Engine warning             | Local node v26 vs target 20.x | Cosmetic — build completes |

### Environment variable groups

Create three environments in Vercel:

1. **Preview** — uses staging Supabase, demo auth enabled
2. **Staging** — uses staging Supabase, demo auth disabled
3. **Production** — uses production Supabase, demo auth disabled

## Cloudflare

Cloudflare changes require explicit production-ops task. Allowed documented change types:

- DNS record update
- WAF rule update
- Rate-limit rule update
- Cache rule update
- Worker route update

Each change must record: zone, current value, new value, reason, rollback value, validation command.

## GitHub CI

The CI pipeline (`.github/workflows/ci.yml`) must pass before any production deploy:

```bash
# Equivalent local check:
pnpm db:generate && pnpm typecheck && pnpm build && pnpm test && pnpm docs:check && pnpm lint && pnpm license:check && git diff --check
```

Include route/action parity:

```bash
pnpm routes:check
```

Database-backed staging check:

```bash
RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test
```

This local command is necessary but not sufficient. Production readiness also requires the remote GitHub workflow to pass on the exact commit being deployed.

## Rollback-First Debugging Rule

When debugging a production incident, apply these rules BEFORE attempting any fix in the production or preview environment:

### How to identify the last healthy deployment

1. Check `docs/13_CHECKPOINTS.md` — look for the most recent entry with all verification columns marked "pass" and a passing CI run URL
2. Check `git log --oneline -10` — correlate with checkpoint dates
3. Find the most recent commit where:
   - `pnpm build` passed (53/53 pages)
   - `pnpm test` passed (all suites)
   - CI run was green (GitHub Actions URL in checkpoint)
   - Vercel health endpoint returned 200

### When to rollback

Rollback immediately when:

- A production-affecting fix fails twice (build, test, or runtime check)
- Middleware/auth/runtime routing was changed without restoring health
- The fix is iterated more than twice without success
- The root cause is in infrastructure/environment but code is being patched to work around it

### What must NOT be debugged live

- Middleware runtime behavior (env availability, cookie parsing, redirect logic)
- Auth session resolution
- Webhook signature verification
- Route/API error classification
- Database connection pooling or migration state
- The absence of env vars that should be set in production

These are infrastructure concerns. Missing env/auth/deployment access is not a code bug. Patch the environment, not the middleware.

### How to record residual issue after restore

After rolling back to a known healthy deployment, create a checkpoint entry in `docs/13_CHECKPOINTS.md`:

```markdown
| 2026-05-25 | Rollback to <commit> | pass | Restored from <bad-commit>. Residual: <issue>. Root cause deferred. |
```

Fields:

- **Rollback to**: commit hash of restored state
- **Restored from**: commit hash that was reverted
- **Residual**: one-line description of the unfixed issue
- **Root cause deferred**: reason production fix was not attempted

### How to resume root-cause analysis safely

Only after production is confirmed healthy on the restored state:

1. Reproduce the issue in a local or staging environment
2. Isolate the root cause (env, config, code, dependency)
3. Fix in a branch with a regression test
4. Run full verification locally
5. Open PR with evidence
6. Deploy through normal CI → preview → staging → production flow

Never skip the staging/preview step for production-affecting changes.

## Rollback Playbook

### Scenario: Migration fails on production

1. Stop the migration process
2. Apply forward-fix SQL (e.g., make column nullable, set default)
3. Verify DB health with queries
4. Continue deploy or rollback Vercel

### Scenario: Vercel build succeeds but app has runtime errors

1. Check Vercel logs for the error pattern
2. If critical → rollback Vercel to previous deployment
3. Fix the issue in a branch
4. Deploy again after fix + review + CI

### Scenario: Webhook processing silently fails

1. Check webhook failure rate in dashboard
2. Check `webhookEvent.status` for recent events
3. If broken → disable webhook integration via `WebhookIntegration.status = DISABLED`
4. Fix the pipeline, re-enable, verify with test event

### Scenario: Data corruption discovered

1. DO NOT modify the data until root cause is understood
2. Disable the feature that caused corruption
3. Restore from backup if approved
4. Document the incident per `docs/22_INCIDENT_RESPONSE.md`

# Disaster Recovery Runbook

## Overview

This document defines the recovery path for TradeOS Core infrastructure. It answers the CEO question: _if the system fails for 2 hours, how much money is lost and how much can recover automatically?_

## Outage Cost Formula

```
estimatedLoss = missedInboundPerHour × outageHours × conversionRate × avgDealValue
```

Where:

| Variable               | Source                        | Example      |
| ---------------------- | ----------------------------- | ------------ |
| `missedInboundPerHour` | WebhookEvent count (24h) / 24 | 120 / 24 = 5 |
| `outageHours`          | Duration of outage            | 2            |
| `conversionRate`       | Tenant setting (0.0–1.0)      | 0.05 (5%)    |
| `avgDealValue`         | Tenant setting (USD)          | $50,000      |

Example: 5 × 2 × 0.05 × $50,000 = **$25,000 estimated loss for a 2-hour outage**

Configure `avgDealValue` and `conversionRate` at `/settings` (OWNER/ADMIN only).

## Architecture

```
Internet → Vercel Edge/Functions → Supabase (Postgres + Auth)
                                       ↓
                              S3 WAL Archive
                                       ↓
                              Point-in-Time Restore
```

- **Compute**: Vercel (serverless functions, global edge network)
- **Database**: Supabase Postgres with Point-in-Time Recovery (PITR)
- **Auth**: Supabase Auth (GoTrue, JWTs)
- **Queue**: Job table in Postgres (no external queue — data is in DB)

## RPO and RTO Targets

| Metric                             | Target        | Rationale                                                                 |
| ---------------------------------- | ------------- | ------------------------------------------------------------------------- |
| **RPO** (Recovery Point Objective) | **5 minutes** | Supabase continuous WAL archiving guarantees < 5 min data loss on restore |
| **RTO** (Recovery Time Objective)  | **2 hours**   | Time to restore DB from PITR, re-deploy Vercel, verify data integrity     |
| **Failover**                       | Manual        | No multi-region active-active; restore in same region                     |
| **Backup verification**            | Monthly       | Restore to staging and run data integrity checks                          |

## Recovery Scenarios

### 1. Database Corruption or Data Loss

**Symptoms**: API returns 5xx, `/api/health/deep` shows `database: { ok: false }`, query errors in logs.

**Severity**: Critical

**Steps**:

1. Confirm damage scope via Supabase SQL editor or `psql`
2. Go to Supabase Dashboard → Database → Backups
3. Select the latest backup before the corruption event (within RPO window)
4. Click **Restore** → choose "Restore as new database" (creates a new instance)
5. Update `DATABASE_URL` and `DIRECT_URL` environment variables in Vercel
6. Re-deploy Vercel: `vercel deploy --prod`
7. Run integrity check: `SELECT count(*) FROM organizations`, verify job queue health via `/api/health/deep`
8. Update DNS or Vercel domain if the database endpoint changed

**Estimated time**: 30–90 minutes

**Rollback**: The corrupted database remains untouched; switch back by reverting env vars and re-deploying.

### 2. Compute Outage (Vercel)

**Symptoms**: API returns 502/503, Vercel dashboard shows incident.

**Severity**: High

**Steps**:

1. Check [Vercel Status](https://www.vercel-status.com/)
2. If regional outage, deploy to alternate region
3. If platform-wide, wait for resolution; no recovery action possible
4. After resolution, verify `/api/health` and `/api/health/deep`

**Estimated time**: Depends on Vercel incident duration

**Auto-recovery**: Vercel re-deploys automatically when platform recovers. Jobs remain PENDING in DB and will process when worker resumes.

### 3. Worker Queue Stuck

**Symptoms**: Queue depth grows on dashboard, `/api/health/deep` shows high pendingJobs, no processing.

**Severity**: High

**Steps**:

1. Check worker logs: `pnpm dev:worker` (local) or Vercel logs (production)
2. If worker process crashed, restart: `pnpm dev:worker`
3. If worker is processing but failing, check `/webhook-events` for FAILED events
4. Use retry endpoint `POST /api/webhooks/[id]/retry` for specific failed events
5. If stuck jobs are in RUNNING state for > 5 minutes, mark them as FAILED or PENDING manually via database
6. As temporary fallback, set `WORKER_ENABLED=false` to process synchronously

**Estimated time**: 5–30 minutes

**Auto-recovery**: Failed jobs retry automatically with exponential backoff (1s, 2s, 4s, … up to 5 min, max 3 attempts).

### 4. Auth Provider (Supabase Auth) Outage

**Symptoms**: Login returns errors, session validation fails.

**Severity**: High

**Steps**:

1. Check [Supabase Status](https://status.supabase.com/)
2. Existing sessions remain valid until JWT expiry (default 1 hour)
3. New logins are blocked until Supabase recovers
4. API routes return `AUTH_REQUIRED` for unauthenticated requests
5. Public webhook routes continue to process (they use signature verification, not sessions)
6. After recovery, users may need to re-login if their session expired

**Estimated time**: Depends on Supabase incident

## Restore Drill Procedure

**Prerequisites**:

- Supabase CLI authenticated (`supabase login`)
- Staging project created in Supabase
- `DATABASE_URL` pointing to staging in `.env`

**Steps** (requires explicit production-ops task):

```bash
# 1. Create a backup of the production database
supabase db dump --db-url "$PROD_DATABASE_URL" -f prod_backup_$(date +%Y%m%d).sql

# 2. Restore to staging
supabase db push --db-url "$STAGING_DATABASE_URL"
psql "$STAGING_DATABASE_URL" < prod_backup_*.sql

# 3. Verify data integrity
psql "$STAGING_DATABASE_URL" -c "SELECT count(*) FROM organizations;"
psql "$STAGING_DATABASE_URL" -c "SELECT count(*) FROM leads;"
psql "$STAGING_DATABASE_URL" -c "SELECT status, count(*) FROM jobs GROUP BY status;"

# 4. Restore took: record start and end time for RTO tracking
# 5. Data loss: compare row counts between backup and staging post-restore for RPO tracking
```

**Evidence**: Save restore logs to `docs/drill-evidence/` with timestamp.

**Cadence**: Monthly restore drill recommended. Schedule: first Monday of each month.

## Backup Verification Schedule

| What                          | How                                               | Frequency         |
| ----------------------------- | ------------------------------------------------- | ----------------- |
| Supabase PITR backup exists   | Check Supabase Dashboard → Backups                | Daily (automated) |
| Supabase WAL archiving active | Check Supabase Dashboard → Database → WAL Archive | Weekly            |
| Full restore drill            | Execute steps above against staging               | Monthly           |
| Vercel deployment integrity   | Run `pnpm build` in CI                            | Every deployment  |

## Key Environment Variables

| Variable                               | Purpose                                                | Required for restore       |
| -------------------------------------- | ------------------------------------------------------ | -------------------------- |
| `DATABASE_URL`                         | Primary database connection                            | Yes                        |
| `DIRECT_URL`                           | Direct database connection (connection pooling bypass) | Yes                        |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                   | Yes                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous key                                 | Yes                        |
| `SUPABASE_SERVICE_ROLE_KEY`            | Admin operations                                       | Yes                        |
| `ALLOW_DEMO_AUTH`                      | Demo mode flag                                         | No                         |
| `WORKER_ENABLED`                       | Async queue processing                                 | No                         |
| `WEBHOOK_ENCRYPTION_KEY`               | Webhook secret encryption                              | No (regenerate on restore) |
| `WEBHOOK_SECRET`                       | Shared webhook secret                                  | No (rotate after restore)  |
| `LOG_LEVEL`                            | Log verbosity                                          | No                         |

## Recovery Order

During a full disaster (all systems down):

1. **Restore database** from Supabase PITR — this is the critical path
2. **Update env vars** in Vercel with new database connection strings
3. **Re-deploy Vercel** — verify `/api/health` returns 200
4. **Start worker** — verify `/api/health/deep` shows queue processing
5. **Verify webhook events** — check `/webhook-events` for queued events
6. **Verify audit logs** — check `/audit-logs` for any gaps

## Cost of Not Being Prepared

| Outage Duration | Estimated Loss (example tenant) | CEO Question                              |
| --------------- | ------------------------------- | ----------------------------------------- |
| 1 hour          | $12,500                         | How much revenue did we lose?             |
| 2 hours         | $25,000                         | Can we recover?                           |
| 8 hours         | $100,000                        | Should this be a board-level incident?    |
| 24 hours        | $300,000                        | What is our disaster declaration process? |

Values based on: 5 inbound/hour, 5% conversion rate, $50,000 avg deal value. Adjust with tenant-specific settings at `/settings`.

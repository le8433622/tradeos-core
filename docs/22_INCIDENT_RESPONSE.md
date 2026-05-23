# Incident Response Runbooks

## Severity Levels

| Level | Label    | Response Time     | Impact                                                        | Examples                                             |
| ----- | -------- | ----------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| SEV1  | Critical | 15 min            | All tenants unable to send/receive messages or data loss risk | DB outage, webhook total failure, auth system down   |
| SEV2  | High     | 30 min            | Feature degraded for some tenants                             | AI provider down, queue backlog > 1h, worker offline |
| SEV3  | Medium   | 2 hours           | Non-critical feature broken                                   | Report generation failing, export endpoint slow      |
| SEV4  | Low      | Next business day | Cosmetic or minor issue                                       | Dashboard card showing 0, typo in UI                 |

## Incident Response Process

1. **Identify** — alert from health check, user report, or monitoring dashboard
2. **Triage** — determine severity, notify on-call via the channel below
3. **Mitigate** — apply rollback or workaround per runbook
4. **Communicate** — update status page and affected tenants
5. **Resolve** — confirm fix, verify health check returns green
6. **Postmortem** — document root cause, timeline, prevent recurrence

On-call communication: internal Slack/TradeOS channel (define in production setup).

---

## Runbook 1: Webhook Outage

**Severity**: SEV1 (all channels) / SEV2 (single channel)

### Symptoms

- `/api/health/deep` returns `webhookEvents: { ok: false }`
- 5xx responses from webhook routes
- Provider (Zalo/WhatsApp/Email) reports our endpoint as unhealthy
- Zero webhook events received in the last 15 minutes

### First 15 Minutes

1. Check `/api/health/deep` for DB and queue status.
2. Check worker logs: `pnpm logs:worker` or Supabase logs.
3. Verify `WEBHOOK_SECRET` and channel-specific secrets are set correctly in environment.
4. If single channel: check `WebhookIntegration` status — is integration disabled?
5. If all channels: check if `WebhookEvent` table has recent records.
6. **Rollback**: If caused by recent deploy, revert to previous commit:
   ```bash
   git revert HEAD
   git push
   # Vercel auto-deploys on push
   ```

### Customer Communication

```
We are investigating an issue with inbound message processing.
Messages may be delayed. No data loss expected.
Next update in 15 minutes.
```

### Recovery

- Verify webhook route returns `200` on test POST.
- Check `WorkflowEvent` shows events in `RECEIVED` → `PROCESSED` flow.
- Re-process any events stuck in `RECEIVED` status via manual retry UI or API.

---

## Runbook 2: AI Provider Outage

**Severity**: SEV2

### Symptoms

- All AI responses fall back to keyword detection (`budgetLimited: false` but deterministic plan returned)
- `planWithLlm` returning `null` consistently
- OpenAI API returning 5xx or timeouts

### First 15 Minutes

1. Check `OPENAI_API_KEY` is valid and has credit.
2. Check OpenAI status page (https://status.openai.com).
3. If OpenAI outage: no action needed — system auto-falls back to `planTradeAgent()` keyword detection.
4. If key issue: rotate key in environment variable.
5. Check `LOG_LEVEL=debug` logs for LLM request/response details.

### Customer Communication

```
AI assistant features are currently using keyword-based fallback.
All messages are still processed and leads created. Full AI recovery expected once provider is restored.
```

### Recovery

- No rollback needed — fallback is automatic and safe.
- After provider recovers, verify `runTradeAgent` returns LLM plan on next message.
- Monitor AI spend to ensure no cost spike from queued requests.

---

## Runbook 3: Database Outage

**Severity**: SEV1

### Symptoms

- `/api/health/deep` returns `database: { ok: false }`
- All API routes returning 500 errors
- Supabase dashboard shows DB in recovery or unavailable

### First 15 Minutes

1. Check Supabase dashboard for database status.
2. Verify `DATABASE_URL` and `DIRECT_URL` are correct.
3. If Supabase region issue: no mitigation except waiting for recovery.
4. If connection pool exhausted: restart app servers (Vercel re-deploy).
5. If schema corruption: restore from Point-in-Time Recovery (see DR runbook).

### Rollback

- **Schema migration issue**: revert migration:
  ```bash
  pnpm prisma migrate diff --from-schema-datamodel=<current> --to-schema-datamodel=<previous> --script > rollback.sql
  pnpm supabase db execute --file rollback.sql
  ```
- **Full DB failure**: restore from backup (Supabase PITR, < 5 min RPO).

### Customer Communication

```
We are experiencing a database outage. Services are temporarily unavailable.
We are restoring services from backup. No data loss is expected.
Next update in 10 minutes.
```

### Recovery

- After DB is back, run `pnpm db:generate` to ensure client matches schema.
- Verify `/api/health/deep` returns `ok`.
- Check queue depth — worker may need to catch up on missed jobs.

---

## Runbook 4: Authentication Outage

**Severity**: SEV1

### Symptoms

- Users cannot log in
- API routes return 401 for authenticated users
- Supabase auth endpoints returning errors

### First 15 Minutes

1. Check Supabase auth status (https://status.supabase.com).
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.
3. Try logging in directly via Supabase API to isolate the issue.
4. If demo auth mode: ensure `ALLOW_DEMO_AUTH=true` or `NODE_ENV=development`.
5. If Supabase issue: wait for recovery — no local mitigation.
6. If configuration issue: correct environment variables and re-deploy.

### Customer Communication

```
We are experiencing an authentication issue. Login is temporarily unavailable.
Existing sessions may still work. Accounts and data are safe.
Next update in 15 minutes.
```

### Rollback

- Revert any recent auth-related changes.
- Restore Supabase project settings from backup if misconfigured.

### Recovery

- Verify login flow works in staging before announcing recovery.
- Check that session resolution (`resolveSessionFromEmail`) returns correct user context.

---

## Runbook 5: Failed Migration

**Severity**: SEV2 (blocking dev/deploy) / SEV3 (non-blocking)

### Symptoms

- `pnpm db:generate` or `pnpm prisma migrate dev` fails
- Schema validation errors during build
- Deploy fails with Prisma client version mismatch

### First 15 Minutes

1. Read the error message — Prisma validation errors are usually specific.
2. Check if the schema has conflicting relation fields (missing opposite relation, duplicate unique constraints).
3. If shadow database issue: `pnpm prisma migrate reset` (destroys data — only in dev).
4. If build issue: ensure `pnpm db:generate` runs before `pnpm build`.
5. **Rollback schema**: revert the Prisma schema file changes and re-run `pnpm db:generate`.

### Customer Communication (SEV2 only)

```
A scheduled maintenance update encountered an issue. We are rolling back.
No customer impact expected.
```

### Prevention

- Always run `pnpm db:generate && pnpm build` locally before pushing.
- Run `pnpm prisma migrate dev --name <desc>` to create a migration, then generate.
- Never edit generated migration files manually.

---

## Postmortem Template

```markdown
# Postmortem: <incident title>

**Date**: YYYY-MM-DD
**Severity**: SEVX
**Duration**: X hours Y minutes
**Impact**: <who was affected and how>

## Timeline

| Time (UTC) | Event              |
| ---------- | ------------------ |
| HH:MM      | Incident detected  |
| HH:MM      | Triage complete    |
| HH:MM      | Mitigation applied |
| HH:MM      | Service restored   |

## Root Cause

<one paragraph>

## What Went Well

- <item>

## What Went Wrong

- <item>

## Action Items

- [ ] <owner>: <action> (<link to task>)
```

## Ownership Table

| Component                      | Primary Contact   | Backup Contact |
| ------------------------------ | ----------------- | -------------- |
| Next.js / API routes           | Platform team     | Backend team   |
| Worker / Queue                 | Platform team     | Backend team   |
| Database (Supabase)            | Operations team   | Platform team  |
| Auth (Supabase)                | Operations team   | Security team  |
| AI / LLM                       | AI team           | Platform team  |
| Webhooks (Zalo/WhatsApp/Email) | Integrations team | Platform team  |

_(Update this table with real names/teams during production setup.)_

# Observability and On-Call Thresholds

## SLO Targets

| Metric                          | Target         | Measurement                                                                                      |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| API p95 latency (non-AI routes) | < 500 ms       | `X-Request-Id` timing / structured logs                                                          |
| Webhook route p95 latency       | < 500 ms       | `X-Request-Id` timing / structured logs                                                          |
| Worker queue lag p95            | < 60 seconds   | `nextRunAt` vs `createdAt` on Job records                                                        |
| Webhook processing success      | > 99.5%        | `FAILED` / (`PROCESSED` + `FAILED`) per 24h                                                      |
| Audit write success             | 100%           | Registered actions always write audit. If write fails, action is rolled back via `$transaction`. |
| AI fallback rate                | < 10%          | `UNKNOWN` intent / total `runTradeAgent` calls                                                   |
| LLM cost per tenant             | capped by plan | Tracked via usage metering                                                                       |

## Health Check Endpoints

### `GET /api/health`

Simple liveness check. Returns `{ ok: true, service: 'tradeos-core-web' }`. No dependencies required.

### `GET /api/health/deep`

Deep health check. Tests:

- **Database**: runs `SELECT 1`, returns `ok: false` if unreachable
- **Queue**: counts pending and recently failed jobs
  Returns HTTP 200 if all checks pass, 503 if any check fails.

## On-Call Thresholds

### Page-worthy (immediate response required)

| Condition                                                   | Action                                 |
| ----------------------------------------------------------- | -------------------------------------- |
| Health deep check returns 503 for 2+ consecutive probes     | Investigate database or queue          |
| Webhook failure rate > 5% in any 15-minute window           | Check worker logs and webhook payloads |
| Queue depth > 100 pending jobs not consumed in 5 minutes    | Restart worker or check for stuck jobs |
| Any API route returns 5xx for > 1% of requests in 5 minutes | Check deployment and error logs        |

### Ticket-worthy (next business day)

| Condition                                  | Action                                        |
| ------------------------------------------ | --------------------------------------------- |
| Webhook success rate < 99.5% over 24 hours | Review failed events and retry                |
| > 10 jobs permanently FAILED in 24h        | Check worker processor logic                  |
| AI fallback rate > 10% over 24h            | Review LLM provider status and prompt quality |
| Worker queue lag > 60 seconds for any job  | Check worker scaling and polling interval     |

## Request ID Propagation

Every HTTP response includes an `X-Request-Id` header (UUID v4). This ID appears in structured log entries to correlate requests across the system.

To trace a request:

1. Note the `X-Request-Id` from the response header
2. Search structured logs for `requestId: <id>`
3. All logs for that request share the same requestId

## Log Format

Structured logs are written as JSON lines to stdout/stderr:

```json
{
  "timestamp": "2026-05-21T12:00:00.000Z",
  "level": "INFO",
  "msg": "Webhook received",
  "requestId": "abc-123",
  "organizationId": "org-1",
  "channel": "ZALO"
}
```

Log levels: `DEBUG`, `INFO`, `WARN`, `ERROR` (controlled by `LOG_LEVEL` env var, default: `INFO`).

## Recovery Playbooks

### Worker stuck or not processing

1. Check `GET /api/health/deep` → queue section
2. If `pendingJobs` is growing and worker is running, check worker logs
3. Restart worker: `pnpm dev:worker`
4. If worker disabled, set `WORKER_ENABLED=false` and routes fall back to synchronous processing

### Database unreachable

1. Check Supabase dashboard for incidents
2. All API routes degrade gracefully with error responses
3. Worker also fails; jobs remain in PENDING state and retry on next attempt

### High webhook failure rate

1. Check `/audit-logs` for errors in recent actions
2. Check `/webhook-events` for FAILED events
3. Use retry endpoint `POST /api/webhooks/[id]/retry` to reprocess specific events
4. If many events fail the same way, check provider API contract changes

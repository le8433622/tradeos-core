# Data Retention Policy

## Overview

This document defines how long different data classes are stored, when they are archived or redacted, and how to handle tenant data export before destructive operations.

## Retention Classes

| Data Class                               | Retention Period                                    | Action After Period                                | Rationale                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Webhook payloads**                     | 90 days (configurable via `RETENTION_ARCHIVE_DAYS`) | Payload field set to NULL; event metadata retained | Raw payload is for reprocessing only. After 90 days, only eventKey, status, channel, and timestamps remain for idempotency and audit. |
| **Webhook event metadata**               | Indefinite                                          | Kept                                               | eventKey, status, channel, receivedAt, processedAt, error — critical for idempotency and audit trail.                                 |
| **Audit logs**                           | Indefinite                                          | Kept                                               | Legal and compliance requirement. Input/result fields are redacted before storage (passwords, secrets, tokens).                       |
| **Messages**                             | 1 year                                              | Archive to cold storage (future)                   | Required for AI training improvement and customer dispute resolution.                                                                 |
| **Conversations**                        | 1 year                                              | Archive with messages                              | Metadata (title, channel, externalId) may be kept longer for reporting.                                                               |
| **AI traces (AiUsageEvent)**             | 1 year                                              | Aggregate and delete raw records                   | Usage data is rolled up into monthly aggregates for billing; individual LLM call records are not needed past 1 year.                  |
| **Leads, Companies, Contacts, Products** | Indefinite                                          | Kept                                               | Core business data with ongoing operational value.                                                                                    |
| **Quotations, Tasks**                    | Indefinite                                          | Kept                                               | Until explicitly archived or deleted by authorized user action.                                                                       |
| **Approval requests**                    | 3 years                                             | Archive                                            | Financial and compliance requirement for trade transactions.                                                                          |
| **Jobs**                                 | 90 days after COMPLETED/FAILED/CANCELLED            | Delete                                             | Job queue is operational; old records have no value after the event they reference is processed.                                      |
| **Notifications**                        | 1 year                                              | Delete                                             | Operational notifications lose relevance after 1 year.                                                                                |

## Archive Mechanism

### Webhook Payload Redaction

Old webhook payloads are redacted by the `ARCHIVE_WEBHOOK_PAYLOADS` background job:

1. Worker picks up `ARCHIVE_WEBHOOK_PAYLOADS` job
2. Finds all `WebhookEvent` records where `receivedAt < now - RETENTION_ARCHIVE_DAYS` and `payload IS NOT NULL`
3. Sets `payload = NULL` and `result = NULL`
4. Event metadata (`id`, `eventKey`, `status`, `channel`, `receivedAt`, `processedAt`, `error`) is preserved

After redaction, the webhook event remains visible in `/webhook-events` UI but shows "Archived" instead of payload content.

### Scheduling

Archive jobs are NOT automatically enqueued on a schedule. They must be triggered explicitly via the worker or a manual API call. This prevents accidental mass data deletion.

To trigger an archive job:

```bash
# Via API (future): POST /api/retention/archive
# Or directly: enqueue a job via the database
```

## Tenant Export Before Destructive Operations

Before any data deletion operation (payload redaction, message archiving, job cleanup):

1. **Export option**: Tenant OWNER/ADMIN can request a data export at `/settings`
2. **Export format**: JSON dump of all tenant data scoped to the retention class
3. **Export delivery**: Download link sent to the admin email (future: direct download)
4. **Confirmation**: Export must be acknowledged before deletion proceeds

## Environment Variables

| Variable                 | Default | Description                                                                                 |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------- |
| `RETENTION_ARCHIVE_DAYS` | `90`    | Days after which webhook payloads are redacted                                              |
| `RETENTION_ENABLED`      | `false` | Master switch for automatic retention jobs. Must be explicitly set to `true` in production. |

## Safety Guards

1. **No auto-deletion**: No retention job runs automatically. All destructive operations require explicit enqueue.
2. **Batch limits**: Archive jobs process a maximum of 500 records per run. If more records remain, the job fails with a message and must be re-enqueued.
3. **Audit trail**: All redaction operations are logged via the job queue. The `WebhookEvent` status field remains unchanged.
4. **Rollback**: Pause retention by not enqueuing archive jobs. Jobs already in the queue can be cancelled via `cancelJob`.

## Data Flow Diagram

```
Webhook received
  → WebhookEvent created with payload (RECEIVED)
  → Worker processes event → payload kept for retry
  → After RETENTION_ARCHIVE_DAYS:
      → Archive job sets payload = NULL
      → Event metadata preserved indefinitely
  → Audit log entry exists independently (not affected by archive)
```

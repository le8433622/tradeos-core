# ADR 005: Audit Log Immutability

**Status**: Accepted (2025-04)
**Risk Area**: Security, Data Privacy
**Reviewer**: CISO

## Context

Audit logs are the authoritative record of all AI and manual actions. They must be tamper-proof for compliance and incident investigation.

## Decision

Audit logs are append-only:

1. No update or delete operations on `AuditLog` model
2. `organizationId` is nullable with `SetNull` on cascade — logs persist even after tenant deletion
3. PII in audit logs is redacted at query time via `redactForAudit()`, not at write time
4. Input and result are stored as JSON blobs for full reconstruction
5. Actor identity is recorded (even if user is later deleted, the ID reference is preserved)

## Consequences

- Incident investigators can trust audit trail
- Tenant deletion preserves logs for compliance
- Redaction is query-time, not storage-time — full detail available to authorized roles
- Cannot fix incorrect log entries (must append correction entry instead)

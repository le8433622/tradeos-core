# SOC 2 Readiness Evidence Checklist

**Status**: Draft
**Owner**: CISO
**Last updated**: 2026-05-21

This document maps TradeOS controls to SOC 2 Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy). Use this to prepare enterprise security packets and identify gaps before formal audit.

---

## CC1: Control Environment

| #   | Control                          | Evidence Location                           | Status        | Notes                                                    |
| --- | -------------------------------- | ------------------------------------------- | ------------- | -------------------------------------------------------- |
| 1.1 | Code of conduct / acceptable use | `AGENTS.md`, `docs/00_PRODUCT_MANIFESTO.md` | ✅ Documented | Agent charter defines non-negotiable rules               |
| 1.2 | Organizational structure         | `CODEOWNERS`                                | ✅ Documented | Primary/backup owner per package                         |
| 1.3 | Roles and responsibilities       | `AGENTS.md`, `CODEOWNERS`                   | ✅ Documented | Architecture boundaries, required reviewer per risk area |

## CC2: Communication and Information

| #   | Control                                     | Evidence Location                                         | Status        | Notes                                                          |
| --- | ------------------------------------------- | --------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| 2.1 | Internal communication of responsibilities  | `docs/20_DEVELOPER_ONBOARDING.md`                         | ✅ Documented | Onboarding manual covers reading path, recipes, security rules |
| 2.2 | External communication of system boundaries | `docs/00_PRODUCT_MANIFESTO.md`, `docs/01_ARCHITECTURE.md` | ✅ Documented | Product scope and architecture documented                      |
| 2.3 | Incident reporting process                  | `docs/22_INCIDENT_RESPONSE.md`                            | ✅ Documented | SEV1-SEV4 runbooks with escalation paths                       |

## CC3: Risk Assessment

| #   | Control                     | Evidence Location                                               | Status        | Notes                                |
| --- | --------------------------- | --------------------------------------------------------------- | ------------- | ------------------------------------ |
| 3.1 | Risk identification process | `docs/22_INCIDENT_RESPONSE.md`                                  | ✅ Documented | Runbooks include risk assessment     |
| 3.2 | Risk mitigation strategy    | `docs/10_DEPLOYMENT_RUNBOOK.md`, `docs/17_DISASTER_RECOVERY.md` | ✅ Documented | RPO 5 min, RTO 2 hours               |
| 3.3 | Third-party risk assessment | —                                                               | ⚠️ Gap        | No vendor risk assessment documented |

## CC4: Monitoring

| #   | Control                            | Evidence Location              | Status        | Notes                                   |
| --- | ---------------------------------- | ------------------------------ | ------------- | --------------------------------------- |
| 4.1 | System monitoring                  | `docs/15_OBSERVABILITY.md`     | ✅ Documented | SLO dashboard, metrics                  |
| 4.2 | Incident detection                 | `docs/22_INCIDENT_RESPONSE.md` | ✅ Documented | SEV definitions, detection criteria     |
| 4.3 | Monitoring of third-party services | —                              | ⚠️ Gap        | No formal third-party monitoring policy |

## CC5: Control Activities

| #   | Control                  | Evidence Location                                | Status                  | Notes                                                |
| --- | ------------------------ | ------------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| 5.1 | Access control policy    | `docs/06_SECURITY_AND_TENANCY.md`                | ✅ Documented           | Role-based access, tenant isolation                  |
| 5.2 | Segregation of duties    | `packages/policy-core/src/index.ts`, `AGENTS.md` | ✅ Documented           | AI cannot execute high-risk actions without approval |
| 5.3 | Change management        | `docs/adr/README.md`, `AGENTS.md`                | ✅ Documented           | ADR process, review requirements                     |
| 5.4 | Configuration management | `vercel.json`, `turbo.json`, `.env.example`      | ✅ Partially documented | CI/CD pipeline configs exist                         |
| 5.5 | Incident response        | `docs/22_INCIDENT_RESPONSE.md`                   | ✅ Documented           | 5 runbooks with rollback paths                       |

## CC6: Logical and Physical Access

| #   | Control                  | Evidence Location                                                   | Status                  | Notes                                                |
| --- | ------------------------ | ------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| 6.1 | Logical access controls  | `packages/auth/src/index.ts`                                        | ✅ Implemented          | Supabase session, role gating                        |
| 6.2 | Physical access controls | Supabase SOC 2 report                                               | ✅ Inherited            | Covered by Supabase compliance                       |
| 6.3 | Authentication           | `packages/auth/src/index.ts`, `apps/web/app/auth/callback/route.ts` | ✅ Implemented          | Supabase auth, magic link                            |
| 6.4 | Authorization            | `packages/policy-core/src/index.ts`                                 | ✅ Implemented          | `assertRole`, `validateRecordBelongsToOrg`           |
| 6.5 | Tenant isolation         | All queries include `organizationId`                                | ✅ Implemented          | Every tenant-scoped query scoped by `organizationId` |
| 6.6 | API access control       | `apps/web/lib/api-errors.ts`                                        | ✅ Implemented          | `withApiSession` enforces role gates                 |
| 6.7 | Secret/key management    | `.env.example`, `AGENTS.md`                                         | ✅ Partially documented | Secrets in env vars; no secret rotation policy       |

## CC7: System Operations

| #   | Control             | Evidence Location              | Status                  | Notes                   |
| --- | ------------------- | ------------------------------ | ----------------------- | ----------------------- |
| 7.1 | System monitoring   | `docs/15_OBSERVABILITY.md`     | ✅ Documented           | SLO dashboard           |
| 7.2 | Capacity planning   | `docs/21_BILLING_STRATEGY.md`  | ✅ Partially documented | Usage limits per plan   |
| 7.3 | Backup and recovery | `docs/17_DISASTER_RECOVERY.md` | ✅ Documented           | RPO 5 min, RTO 2 hours  |
| 7.4 | Incident management | `docs/22_INCIDENT_RESPONSE.md` | ✅ Documented           | Full incident lifecycle |

## CC8: Change Management

| #   | Control              | Evidence Location                                           | Status        | Notes                                  |
| --- | -------------------- | ----------------------------------------------------------- | ------------- | -------------------------------------- |
| 8.1 | Change authorization | `AGENTS.md`, `docs/adr/README.md`                           | ✅ Documented | ADR for cross-cutting, reviewer matrix |
| 8.2 | Testing              | `docs/09_TESTING_STRATEGY.md`, `packages/ai-core/src/eval/` | ✅ Documented | Unit tests, eval harness               |
| 8.3 | Deployment           | `docs/10_DEPLOYMENT_RUNBOOK.md`                             | ✅ Documented | Deployment runbook                     |
| 8.4 | Emergency changes    | `docs/22_INCIDENT_RESPONSE.md`                              | ✅ Documented | Rollback steps in runbooks             |

## CC9: Business Continuity

| #   | Control                  | Evidence Location              | Status        | Notes                               |
| --- | ------------------------ | ------------------------------ | ------------- | ----------------------------------- |
| 9.1 | Business continuity plan | `docs/17_DISASTER_RECOVERY.md` | ✅ Documented | DR and continuity plan              |
| 9.2 | Backup procedures        | `docs/17_DISASTER_RECOVERY.md` | ✅ Documented | WAL archiving, PITR                 |
| 9.3 | Recovery testing         | —                              | ⚠️ Gap        | No documented recovery test results |

## A1: Availability

| #    | Control           | Evidence Location                            | Status         | Notes                     |
| ---- | ----------------- | -------------------------------------------- | -------------- | ------------------------- |
| A1.1 | Uptime monitoring | Vercel dashboard, `docs/15_OBSERVABILITY.md` | ✅ Implemented | SLO metrics, dashboard    |
| A1.2 | Redundancy        | Supabase HA, Vercel edge network             | ✅ Inherited   | Platform-level redundancy |
| A1.3 | Disaster recovery | `docs/17_DISASTER_RECOVERY.md`               | ✅ Documented  | RPO 5 min, RTO 2 hours    |

## C1: Confidentiality

| #    | Control               | Evidence Location                      | Status         | Notes                                   |
| ---- | --------------------- | -------------------------------------- | -------------- | --------------------------------------- |
| C1.1 | Data classification   | `docs/19_DATA_INVENTORY.md`            | ✅ Documented  | PII/CC/AC/OP/Secret classification      |
| C1.2 | Data retention        | `docs/18_DATA_RETENTION.md`            | ✅ Documented  | 11 retention classes, archive mechanism |
| C1.3 | Data anonymization    | `packages/analytics-core/src/index.ts` | ✅ Implemented | `anonymizeTenantPii` action             |
| C1.4 | Encryption at rest    | Supabase/PostgreSQL                    | ✅ Inherited   | Platform-level encryption               |
| C1.5 | Encryption in transit | HTTPS (Vercel), Supabase TLS           | ✅ Inherited   | Platform-level encryption               |

## P1: Privacy

| #    | Control                   | Evidence Location              | Status        | Notes                                                            |
| ---- | ------------------------- | ------------------------------ | ------------- | ---------------------------------------------------------------- |
| P1.1 | Privacy notice            | `docs/00_PRODUCT_MANIFESTO.md` | ⚠️ Partial    | Product manifesto mentions privacy, but no formal privacy notice |
| P1.2 | Data subject rights       | —                              | ⚠️ Gap        | No GDPR/CCPR rights request process                              |
| P1.3 | Data processing agreement | —                              | ⚠️ Gap        | No DPA documented                                                |
| P1.4 | Data inventory            | `docs/19_DATA_INVENTORY.md`    | ✅ Documented | Full field-level data inventory                                  |
| P1.5 | Data retention            | `docs/18_DATA_RETENTION.md`    | ✅ Documented | Automated payload redaction                                      |

---

## Subprocessor List

| Subprocessor                 | Service                 | Data Scope                         | SOC 2            |
| ---------------------------- | ----------------------- | ---------------------------------- | ---------------- |
| Supabase (PostgreSQL + Auth) | Database, Auth, Storage | All tenant data                    | ✅ SOC 2 Type II |
| Vercel                       | Hosting, Edge Network   | Request/response transient data    | ✅ SOC 2 Type II |
| OpenAI (optional)            | LLM inference           | Trade message text (no PII stored) | ✅ SOC 2 Type II |
| Cloudflare (optional)        | DNS, CDN, DDoS          | Network metadata                   | ✅ SOC 2 Type II |

## Gap Register

| Gap ID  | Description                                          | Priority | Owner | Target  |
| ------- | ---------------------------------------------------- | -------- | ----- | ------- |
| GAP-001 | No vendor/subprocessor risk assessment process       | Medium   | CISO  | Q3 2025 |
| GAP-002 | No formal third-party monitoring policy              | Medium   | CTO   | Q3 2025 |
| GAP-003 | No documented recovery test results                  | High     | CTO   | Q2 2025 |
| GAP-004 | No formal privacy notice / data processing agreement | High     | CISO  | Q2 2025 |
| GAP-005 | No GDPR/CCPR rights request workflow                 | Medium   | CTO   | Q3 2025 |
| GAP-006 | No secret rotation policy                            | Low      | CTO   | Q4 2025 |

## How to Use This Checklist

1. Before enterprise sales calls, review controls marked `✅`.
2. For gaps marked ⚠️, reference the Gap Register for timeline.
3. Subprocessors list can be shared directly with procurement teams.
4. Update gap status as controls are implemented.

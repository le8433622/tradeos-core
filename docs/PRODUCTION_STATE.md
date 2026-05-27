# TradeOS Core — Production State (2026-05-27)

## Current Environment

### Supabase

| Aspect       | Staging                     | Production                          |
| ------------ | --------------------------- | ----------------------------------- |
| Project ref  | `ulnjanlaehfmxurreibj`      | `okkzfmtwrjkfjzyprrwh`              |
| Project name | TradeOS Core Staging        | `tradeos-core-prod`                 |
| Region       | ap-southeast-2              | ap-southeast-2                      |
| Status       | ACTIVE_HEALTHY              | ACTIVE_HEALTHY                      |
| Schema       | 14 migrations baseline      | 14 migrations applied (1 baselined) |
| Seed data    | Yes (demo org + user)       | No (clean DB)                       |
| RLS          | **ALL 38 tables protected** | **ALL 38 tables protected**         |

### RLS Coverage — 100% of production tables protected ✅

| Category                       | Tables                                                                                                                                                                                                                   | Policies                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Core business (15)             | Organization, User, Company, Contact, Lead, Deal, Product, Conversation, Message, Quotation, Task, Notification, AuditLog, ApprovalRequest, WebhookEvent                                                                 | 17 policies in `20260527_add_legacy_core_rls_policies`   |
| Supplier Switch (13)           | SourcingRun, PurchaseBaseline, SupplierAlternative, SupplierCandidate, SupplierQuote, SwitchDecisionReport, EvidenceItem, WorkCheckpoint, OutcomeRecord, HumanHandover, Payment, Job, AiUsageEvent                       | 13 policies in `20260527_add_rls_policies`               |
| **Auxiliary/Admin (#93)** (11) | **\_prisma_migrations**, **QuotationLineItem**, **WebhookIntegration**, **OrganizationMember**, **Role**, **Permission**, **RolePermission**, **Invitation**, **ReportSnapshot**, **IntroductionRequest**, **PlanLimit** | **15 policies in `20260527_add_auxiliary_rls_policies`** |

### Vercel

| Environment  | Supabase Project                                  | Status         |
| ------------ | ------------------------------------------------- | -------------- |
| Production   | `tradeos-core-prod` (ref: `okkzfmtwrjkfjzyprrwh`) | ✅ ISOLATED    |
| Preview / PR | TradeOS Core Staging                              | ✅ (unchanged) |
| Local dev    | TradeOS Core Staging                              | ✅ (unchanged) |

- **Production URL**: <https://tradeos-core.vercel.app>
- **Latest deployment**: 2026-05-27 (auxiliary RLS migration, final)
- **`ALLOW_DEMO_AUTH`**: `false` — verified blocked
- **`E2E_RUN_ENABLED`**: not set — `POST /api/e2e/login` returns 403
- **Health endpoint**: `GET /api/health` → `{"ok":true,"service":"tradeos-core-web"}
- **Email provider**: Gmail SMTP (App Password) via Supabase Auth SMTP
- **Sender**: `earthkingdomuniverse@gmail.com`
- **Status**: Magic link working — verified 2026-05-28
- **Site URL**: `https://tradeos-core.vercel.app` (updated in Supabase Auth settings)
- **Redirect URLs**: `https://tradeos-core.vercel.app/auth/callback`, `http://localhost:3000/auth/callback``

### Migration Baselining

`20260522_deal_orgid` was baselined on production because it adds `organizationId` to `Deal` — redundant on fresh databases where `phase1_core_schema` creates `Deal` with the column already present.

## Migration History (Production)

| #   | Migration                                               | Purpose                             |
| --- | ------------------------------------------------------- | ----------------------------------- |
| 1   | `20260522_deal_orgid`                                   | Baselined                           |
| 2   | `20260522094825_phase1_core_schema`                     | Core schema                         |
| 3   | `20260525_add_payment_and_planlimit`                    | Payment + plan tables               |
| 4   | `20260525_add_payment_external_id`                      | External ID on payment              |
| 5   | `20260526042300_add_purchase_baseline`                  | Purchase baseline                   |
| 6   | `20260526050500_add_supplier_alternative`               | Supplier alternatives               |
| 7   | `20260526055700_add_switch_decision_report`             | Decision reports                    |
| 8   | `20260526061400_add_buyer_decision_fields`              | Buyer decision fields               |
| 9   | `20260526062600_add_outcome_record_and_checkpoint_type` | Outcome + checkpoint type           |
| 10  | `20260527_add_fk_covering_indexes`                      | FK covering indexes (87)            |
| 11  | `20260527_add_legacy_core_rls_policies`                 | Core RLS (15 tables)                |
| 12  | `20260527_add_rls_policies`                             | Supplier Switch RLS (13 tables)     |
| 13  | **`20260527_add_auxiliary_rls_policies`**               | **Auxiliary/admin RLS (11 tables)** |
| 14  | `20260527_fix_search_path`                              | search_path fix                     |

## Kill Switches

`KILL_DASHBOARD`, `KILL_ANALYTICS`, `KILL_WEBHOOKS`, `KILL_INBOX`, `KILL_AI`, `KILL_APPROVALS` — all `"false"` by default.

## Security Notes

- `NEXT_PUBLIC_*` keys are browser-visible
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — server-side only
- Production DB password generated via `openssl rand -base64 24`
- **Move all secrets to 1Password `TradeOS Core Engineering`** and wipe `/tmp/.tradeos_prod_db_pass`

## Connection Details

- Supabase production: `https://supabase.com/dashboard/project/okkzfmtwrjkfjzyprrwh`
- Supabase staging: `https://supabase.com/dashboard/project/ulnjanlaehfmxurreibj`
- Vercel team: earthkingdomuniverse-6943
- GitHub repo: anomalyco/tradeos-core

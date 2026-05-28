# TradeOS Core — Checkpoints

## Active Work Order

**Phase 18 — RBAC & multi-org membership** is the current phase.  
**Real pilot validation** — 1 real buyer, 1 real case, 1 real outcome.  
⚠️ **#113 reopened**: 1Password vault items exist but are empty — production secrets still in Vercel env vars, not in vault.
⚠️ **#122 reopened**: Leaked password protection documented but not enabled on Dashboard (acceptable for magic-link-only pilot).
⛔ **BuyerReportDelivery RLS blocker (#120)**: ✅ FIXED — all 39 app tables have RLS. No app-table RLS-disabled warnings.

---

## Current Status

| Gate                                       | Status             | Notes                                                                                                                                                                      |
| ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS on Supplier Switch tables              | ✅ DONE            | 13 policies via `20260527_add_rls_policies`                                                                                                                                |
| RLS on legacy/core tables                  | ✅ DONE            | 17 policies via `20260527_add_legacy_core_rls_policies`                                                                                                                    |
| **RLS on auxiliary/admin tables (#93)**    | **✅ DONE**        | **15 policies via `20260527_add_auxiliary_rls_policies`**                                                                                                                  |
| FK covering indexes                        | ✅ DONE            | 87 indexes applied                                                                                                                                                         |
| search_path fix                            | ✅ DONE            | `current_user_org_id()` search_path = `public`                                                                                                                             |
| Real Supabase Auth E2E                     | ✅ PASS            | 19/19 tests on staging                                                                                                                                                     |
| Demo auth off on production                | ✅ VERIFIED        | Login page with demo cookie                                                                                                                                                |
| E2E endpoint blocked on production         | ✅ VERIFIED        | POST returns 403                                                                                                                                                           |
| Password rotated                           | ✅ DONE            | pgcrypto SQL update                                                                                                                                                        |
| Supabase production project                | ✅ DONE            | `tradeos-core-prod` (ref: `okkzfmtwrjkfjzyprrwh`)                                                                                                                          |
| Vercel production → production DB          | ✅ DONE            | All env vars updated                                                                                                                                                       |
| **RLS on ALL application tables**          | **✅ COMPLETE**    | **Previously claimed 38/38 but BuyerReportDelivery was missed. #120 fixed it. Now 39/39 with no app-table RLS-disabled warnings.**                                         |
| **NVIDIA QA (#82)**                        | **✅ DONE / PASS** | **12/12 scenarios. No bugs found. Cross-tenant isolation verified.**                                                                                                       |
| **Issue A (#94)**                          | **🔴 OPEN (P1)**   | **Stale APPROVED auto-follow-up**                                                                                                                                          |
| **Issue B (#95)**                          | **🔴 OPEN (P2)**   | **Round savingsPercent to 2 decimals**                                                                                                                                     |
| **Issue C (#96)**                          | **🔴 OPEN (P3)**   | **Demo auth cookie/header alignment**                                                                                                                                      |
| **#99 Auth & Demo Role Accounts**          | **✅ DONE / PASS** | **10/10 E2E tests, 4 roles verified, walkthrough doc**                                                                                                                     |
| **#100 Production email (Gmail SMTP)**     | **✅ DONE**        | **Magic link working on production. Gmail SMTP via Supabase Auth.**                                                                                                        |
| **Auth role foundation**                   | **✅ DONE**        | **Signup/invite bootstrap system roles, added BUYER_REVIEWER**                                                                                                             |
| **#112 Magic link session fix**            | **✅ DONE**        | **`createBrowserClient + setSession` from hash; cookies vs localStorage**                                                                                                  |
| **#94 Stale APPROVED auto-follow-up**      | **✅ DONE**        | **APPROVE → auto-create follow-up task with 14d due (packages/sourcing-core/src/index.ts:767)**                                                                            |
| **#95 Round savingsPercent**               | **✅ DONE**        | **`.toFixed(2)` display + `Math.round` action/API (3 files touched)**                                                                                                      |
| **#96 Demo auth cookie/header**            | **✅ DONE**        | **`middleware.ts` copies `x-demo-auth-email` cookie to header when `ALLOW_DEMO_AUTH=true`**                                                                                |
| **#119 Outcome as Truth**                  | **✅ DONE**        | **Dashboard shows outcome-pending stat + list + banners; sourcing run detail shows outcome pending/complete**                                                              |
| **#118 Decision Freedom Report**           | **✅ DONE**        | **Buyer report rewritten with 6 sections: Current Situation, Evidence, Comparison, Risk, Recommendation, Next Actions**                                                    |
| **#117 Evidence Before Decision**          | **✅ DONE**        | **INSUFFICIENT*EVIDENCE recommendation added; NEEDS*\* missing proof flags; evidence gates SWITCH**                                                                        |
| **#116 Trade Pain Intake**                 | **✅ DONE**        | **3-step intake form: Buyer & Product → Pain & Evidence → Confirm; 11 pain categories; authority tracking**                                                                |
| **#120 BuyerReportDelivery RLS**           | **✅ DONE**        | **Enabled RLS on BuyerReportDelivery (was missed by prior migrations). Added FK index on assignedById. Applied to staging + production.**                                  |
| **#120 No more Security Advisor warnings** | **✅ VERIFIED**    | **All 39 application tables have RLS enabled. Zero `rls_disabled_in_public` warnings.**                                                                                    |
| **#122 Leaked password protection**        | **🔴 REOPENED**    | **Documented in runbook but not enabled on Dashboard. Acceptable for first controlled case (magic link only). Blocked: needs Supabase PAT or Dashboard access.**           |
| **#123 RLS performance + unindexed FKs**   | **✅ DONE**        | **BuyerReportDelivery.assignedById FK index added in #120. current_user_org_id() is STABLE (single eval per query). All formal FK indexes covered by 20260527 migration.** |
| **#113 1Password vault items empty**       | **🔴 REOPENED**    | **Vault structure created (10 items) but none filled with actual secret values. Secrets still live in Vercel env vars. Needs `op signin` + manual fill.**                  |

## Verified Production Behaviour (2026-05-28)

| Check                                        | Result                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/health`                            | `{"ok":true}`                                                                    |
| `GET /` with demo auth cookie                | Login page shown (auth ignored)                                                  |
| `POST /api/e2e/login`                        | 403 Forbidden                                                                    |
| RLS enabled on ALL 39 tables                 | ✅ Every application table protected (39/39 after #120 fix)                      |
| Security Advisor: app-table RLS              | ✅ Zero `rls_disabled_in_public` for app tables                                  |
| Security Advisor: leaked password protection | ⚠️ WARNING — still disabled (#122 reopened; magic-link-only pilot is acceptable) |
| Security Advisor: \_prisma_migrations info   | ℹ️ INFO — has RLS but no policies; accepted (internal table)                     |
| NVIDIA QA scenarios (#82)                    | ✅ 12/12 PASS on staging — SWITCH, WAIT, NEGOTIATE all correct                   |

## Build & Verification Checklist

- [x] `pnpm build` passes locally
- [x] `pnpm lint` passes locally
- [x] `pnpm typecheck` passes (18/18 packages)
- [x] `pnpm test` passes (all packages)
- [x] E2E tests pass with real Supabase Auth (19/19)
- [x] E2E tests pass with demo auth (19/19)
- [x] Health endpoint responds on production
- [x] Demo auth blocked on production
- [x] E2E endpoint blocked on production
- [x] Supabase production project created and isolated
- [x] All 16 migrations applied to production DB
- [x] All 39 tables have RLS enabled on production
- [x] No Security Advisor application-table warnings (#120 fixed the last gap)
- [x] **NVIDIA QA (#82) completed — PASS, no HIGH/CRITICAL bugs**
- [x] **#99 Auth & Demo Role Accounts — seeded 5 accounts, 4 internal roles covered by 10/10 E2E tests, walkthrough doc**
- [x] **Auth signup/invite role bootstrap — OWNER assigned on org creation, invitations assign fixed role, BUYER_REVIEWER added**
- [x] **#112 Magic link → server session fix — `createBrowserClient` + explicit `setSession`, user completes onboarding**
- [x] **#94 Stale APPROVED auto-follow-up — APPROVE auto-creates task with 14d due; stale warnings on list+detail**
- [x] **#95 Round savingsPercent — `.toFixed(2)` at all display + API output layers**

## Residual Risks

| Risk                                        | Severity | Mitigation                                                                     |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Production secrets in Vercel, not 1Password | HIGH     | #113 reopened: vault items created but empty. Needs `op signin` + manual fill. |
| `SUPABASE_SERVICE_ROLE_KEY` in Vercel env   | HIGH     | Server-side only; never exposed to client. Add to 1Password in #113.           |
| No production business seed data            | LOW      | Users start with empty workspace; system roles/permissions bootstrap on signup |
| Gmail SMTP is pilot-grade                   | MEDIUM   | Replace with domain-verified Resend/SES before scaled buyer onboarding         |
| BuyerReportDelivery missing RLS (#120)      | ✅ FIXED | RLS enabled + tenant policy applied to staging + production                    |
| Leaked password protection disabled         | LOW      | Acceptable for first controlled case (magic link only). #122 tracks enablement |

## Next Steps

1. ~~NVIDIA QA (#82) on staging~~ ✅ DONE — PASS, closed
2. ~~#94 (P1) Stale APPROVED auto-follow-up~~ ✅ DONE — APPROVE auto-creates follow-up task
3. ~~#95 (P2) Round savingsPercent~~ ✅ DONE — `.toFixed(2)` display + `Math.round` API
4. ~~#96 (P3) Demo auth cookie/header~~ ✅ DONE — middleware copies cookie to header
5. ~~#119 Outcome as Truth~~ ✅ DONE — dashboard shows outcome-pending stat + list + banners
6. ~~#120 BuyerReportDelivery RLS~~ ✅ DONE — RLS enabled, FK index added, applied to staging+prod
7. ~~#121 Sync docs with live DB state~~ ✅ DONE — docs now honest about gaps found
8. ~~#122 Enable leaked password protection~~ 🔴 REOPENED — documented but not enabled; acceptable for magic-link-only pilot
9. ~~#123 RLS performance + unindexed FKs~~ ✅ DONE — audit completed, no remaining gaps
10. **#113 Fill 1Password vault**: sign in (`op signin`), fill 10+ vault items with production secret values, verify `/api/health` still OK
11. **#122 Enable leaked password protection**: Supabase Dashboard > Auth > Settings > toggle on (or PAT via Management API)
12. **Real pilot validation**: 1 real buyer, 1 real case, 1 real outcome

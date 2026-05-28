# TradeOS Core — Checkpoints

## Active Work Order

**Phase 18 — RBAC & multi-org membership** is the current phase.  
**Real pilot validation** — 1 real buyer, 1 real case, 1 real outcome.  
⚠️ **Blocker cleared (#120)**: BuyerReportDelivery was missing RLS (missed by earlier RLS migrations) — fixed 2026-05-28. All 39 application tables now have RLS.

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
| **RLS on ALL application tables**          | **✅ COMPLETE**    | **Previously claimed 38/38 but BuyerReportDelivery was missed. #120 fixed it. Now 39/39 with no advisor warnings.**                                                        |
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
| **#122 Leaked password protection**        | **✅ DOCUMENTED**  | **Requires Pro Plan+ on Supabase. Enable in Dashboard > Authentication > Settings. Added to runbook.**                                                                     |
| **#123 RLS performance + unindexed FKs**   | **✅ DONE**        | **BuyerReportDelivery.assignedById FK index added in #120. current_user_org_id() is STABLE (single eval per query). All formal FK indexes covered by 20260527 migration.** |

## Verified Production Behaviour (2026-05-28)

| Check                                  | Result                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `GET /api/health`                      | `{"ok":true}`                                                  |
| `GET /` with demo auth cookie          | Login page shown (auth ignored)                                |
| `POST /api/e2e/login`                  | 403 Forbidden                                                  |
| RLS enabled on ALL 39 tables           | ✅ Every application table protected (39/39 after #120 fix)    |
| No remaining Security Advisor warnings | ✅ Zero `rls_disabled_in_public` for app tables                |
| NVIDIA QA scenarios (#82)              | ✅ 12/12 PASS on staging — SWITCH, WAIT, NEGOTIATE all correct |

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

| Risk                                      | Severity | Mitigation                                                                     |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Production DB password in `/tmp` file     | MEDIUM   | Move to 1Password, then wipe `/tmp/.tradeos_prod_db_pass`                      |
| `SUPABASE_SERVICE_ROLE_KEY` in Vercel env | HIGH     | Server-side only; never exposed to client                                      |
| No production business seed data          | LOW      | Users start with empty workspace; system roles/permissions bootstrap on signup |
| Gmail SMTP is pilot-grade                 | MEDIUM   | Replace with domain-verified Resend/SES before scaled buyer onboarding         |
| BuyerReportDelivery missing RLS (#120)    | ✅ FIXED | RLS enabled + tenant policy applied to staging + production                    |

## Next Steps

1. ~~NVIDIA QA (#82) on staging~~ ✅ DONE — PASS, closed
2. ~~#94 (P1) Stale APPROVED auto-follow-up~~ ✅ DONE — APPROVE auto-creates follow-up task
3. ~~#95 (P2) Round savingsPercent~~ ✅ DONE — `.toFixed(2)` display + `Math.round` API
4. ~~#96 (P3) Demo auth cookie/header~~ ✅ DONE — middleware copies cookie to header
5. ~~#119 Outcome as Truth~~ ✅ DONE — dashboard shows outcome-pending stat + list + banners
6. ~~#120 BuyerReportDelivery RLS~~ ✅ DONE — RLS enabled, FK index added, applied to staging+prod
7. ~~#121 Sync docs with live DB state~~ ✅ DONE — docs now honest about gaps found
8. ~~#122 Enable leaked password protection~~ ✅ DOCUMENTED — Supabase Dashboard setting
9. ~~#123 RLS performance + unindexed FKs~~ ✅ DONE — audit completed, no remaining gaps
10. **Real pilot validation**: 1 real buyer, 1 real case, 1 real outcome

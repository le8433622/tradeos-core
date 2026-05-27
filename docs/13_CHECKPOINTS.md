# TradeOS Core — Checkpoints

## Active Work Order

**Phase 18 — RBAC & multi-org membership** is the current phase.  
Production security lock-down COMPLETE — all 38 application tables have RLS.  
NVIDIA QA (#82) COMPLETE — PASS, 12/12 scenarios, no HIGH/CRITICAL bugs.  
**Now: Real pilot validation** — 1 real buyer, 1 real case, 1 real outcome.

---

## Current Status

| Gate                                    | Status             | Notes                                                                |
| --------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| RLS on Supplier Switch tables           | ✅ DONE            | 13 policies via `20260527_add_rls_policies`                          |
| RLS on legacy/core tables               | ✅ DONE            | 17 policies via `20260527_add_legacy_core_rls_policies`              |
| **RLS on auxiliary/admin tables (#93)** | **✅ DONE**        | **15 policies via `20260527_add_auxiliary_rls_policies`**            |
| FK covering indexes                     | ✅ DONE            | 87 indexes applied                                                   |
| search_path fix                         | ✅ DONE            | `current_user_org_id()` search_path = `public`                       |
| Real Supabase Auth E2E                  | ✅ PASS            | 19/19 tests on staging                                               |
| Demo auth off on production             | ✅ VERIFIED        | Login page with demo cookie                                          |
| E2E endpoint blocked on production      | ✅ VERIFIED        | POST returns 403                                                     |
| Password rotated                        | ✅ DONE            | pgcrypto SQL update                                                  |
| Supabase production project             | ✅ DONE            | `tradeos-core-prod` (ref: `okkzfmtwrjkfjzyprrwh`)                    |
| Vercel production → production DB       | ✅ DONE            | All env vars updated                                                 |
| **RLS on ALL 38 production tables**     | **✅ COMPLETE**    | **No more Security Advisor warnings**                                |
| **NVIDIA QA (#82)**                     | **✅ DONE / PASS** | **12/12 scenarios. No bugs found. Cross-tenant isolation verified.** |
| **Issue A (#94)**                       | **🔴 OPEN (P1)**   | **Stale APPROVED auto-follow-up**                                    |
| **Issue B (#95)**                       | **🔴 OPEN (P2)**   | **Round savingsPercent to 2 decimals**                               |
| **Issue C (#96)**                       | **🔴 OPEN (P3)**   | **Demo auth cookie/header alignment**                                |

## Verified Production Behaviour (2026-05-27)

| Check                                  | Result                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `GET /api/health`                      | `{"ok":true}`                                                  |
| `GET /` with demo auth cookie          | Login page shown (auth ignored)                                |
| `POST /api/e2e/login`                  | 403 Forbidden                                                  |
| RLS enabled on ALL 38 tables           | ✅ Every application table protected                           |
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
- [x] All 14 migrations applied to production DB
- [x] All 38 tables have RLS enabled on production
- [x] No Security Advisor application-table warnings
- [x] **NVIDIA QA (#82) completed — PASS, no HIGH/CRITICAL bugs**

## Residual Risks

| Risk                                           | Severity | Mitigation                                                                       |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Production DB password in `/tmp` file          | MEDIUM   | Move to 1Password, then wipe `/tmp/.tradeos_prod_db_pass`                        |
| `SUPABASE_SERVICE_ROLE_KEY` in Vercel env      | HIGH     | Server-side only; never exposed to client                                        |
| No production seed data                        | LOW      | Users start with empty workspace                                                 |
| Magic link email delivery not configured       | MEDIUM   | SES/SMTP must be set up in Supabase production project before real users sign up |
| Stale APPROVED no auto-follow-up (#94)         | MEDIUM   | Open issue — blocks outcome tracking until resolved                              |
| `savingsPercent` floating-point artifact (#95) | LOW      | Cosmetic — report shows 8.300000000000001%                                       |

## Next Steps

1. ~~NVIDIA QA (#82) on staging~~ ✅ DONE — PASS, closed
2. #94 (P1) Stale APPROVED auto-follow-up — outcome cycle dependency
3. #95 (P2) Round savingsPercent — cosmetic
4. #96 (P3) Demo auth cookie/header — low priority
5. **Real pilot validation**: 1 real buyer, 1 real case, 1 real outcome
6. Configure production email (SES/SMTP) for Supabase magic links
7. Rotate and store production secrets in 1Password

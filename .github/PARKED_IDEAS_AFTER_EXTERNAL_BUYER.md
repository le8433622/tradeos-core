# Parked Ideas — Do Not Execute Before #124

This file is not the active roadmap.

Do not create issues from this file before:

1. #125 real-product QA is complete
2. #124 first external buyer pain-solving case is complete
3. real buyer feedback and outcome are documented

Current active path:
#125 → #124 → post-buyer retrospective

---

# Parked Ideas After External Buyer

These ideas were captured from a broad excellence roadmap, but they are intentionally parked to prevent issue sprawl before the current execution path is complete.

**Mission**: Transform TradeOS into the market-leading execution OS for trade relationships with zero compromises on quality, security, and buyer value.

**Current State**: Operationally ready for first external buyer case. **Target State**: Legendary production system with 95%+ test coverage, zero HIGH/CRITICAL issues, and delightful buyer experience.

---

## 📋 Parked Ideas (Do Not Create Automatically)

This brainstorm listed 45 potential issue ideas across 6 categories. Do not create GitHub issues from these ideas until #125, #124, and the post-buyer retrospective are complete.

### 🔴 **PHASE 1: CRITICAL FIX (This Week) — 20.5 hours**

**Impact**: Unblock CI, harden security, fix blocking bugs

#### P0: Blocking Issues (Must Fix Now)

| #    | Issue                                                             | Severity    | Effort | Status |
| ---- | ----------------------------------------------------------------- | ----------- | ------ | ------ |
| #125 | Fix TypeScript errors in ai-core test suite (TS2345 x3)           | 🔴 CRITICAL | 1h     | Active |
| #126 | Verify AI-Core cannot import Prisma (security policy)             | 🔴 CRITICAL | 1h     | Parked |
| #127 | Fix Pre-commit hook — remove lint-staged fallback                 | 🟠 HIGH     | 30m    | Parked |
| #128 | Fix Deal.organizationId migration (non-nullable without backfill) | 🟠 HIGH     | 3h     | Parked |
| #129 | Add Zod validation to POST /api/agent endpoint                    | 🟠 HIGH     | 2h     | Parked |
| #130 | Add Zod validation to PATCH /api/leads endpoint                   | 🟠 HIGH     | 2h     | Parked |
| #131 | Add Zod validation to PATCH /api/introductions/[id] endpoint      | 🟠 HIGH     | 2h     | Parked |

**Subtotal Phase 1**: 11.5h

---

#### P1: Security Hardening (Days 3-4)

| #    | Issue                                                                         | Severity  | Effort | Status |
| ---- | ----------------------------------------------------------------------------- | --------- | ------ | ------ |
| #132 | Verify Supabase token AAL claim parsing in production (MFA enforcement)       | 🟠 HIGH   | 2h     | Parked |
| #133 | Enable leaked password protection on Supabase Auth Dashboard (#122 follow-up) | 🟠 HIGH   | 1h     | Parked |
| #134 | Audit email normalization consistency (invite vs. session resolution)         | 🟡 MEDIUM | 1h     | Parked |
| #135 | Add X-Request-Id header preservation in middleware                            | 🟡 MEDIUM | 1h     | Parked |
| #136 | Harden webhook tenant resolution — disable x-organization-id header in prod   | 🟡 MEDIUM | 2h     | Parked |

**Subtotal Phase 1**: 9h

**Total Phase 1**: 20.5h → **Expected completion: End of week**

---

### 🟡 **PHASE 2: CODE EXCELLENCE (Week 2-3) — 37 hours**

**Impact**: 95%+ test coverage, regression prevention, doc parity

#### Testing & Verification

| #    | Issue                                                                     | Severity  | Effort | Status |
| ---- | ------------------------------------------------------------------------- | --------- | ------ | ------ |
| #137 | Upgrade docs:check CI gate to verify risk/roles/approval (not just names) | 🟠 HIGH   | 3h     | Parked |
| #138 | Add regression tests for cross-tenant access (all HIGH/CRITICAL actions)  | 🟡 MEDIUM | 4h     | Parked |
| #139 | Add MFA regression tests (aal1 blocked, aal2 passes)                      | 🟡 MEDIUM | 3h     | Parked |
| #140 | Achieve 90%+ code coverage on policy-core package                         | 🟡 MEDIUM | 8h     | Parked |
| #141 | Add E2E tests for settings mutations via registered actions               | 🟡 MEDIUM | 4h     | Parked |
| #142 | Add E2E tests for invitation accept flow (POST-only, email mismatch)      | 🟡 MEDIUM | 3h     | Parked |
| #143 | Add performance test suite for RLS query latency baseline                 | 🔵 LOW    | 6h     | Parked |
| #144 | Establish E2E test suite for all registered actions (2 tests per action)  | 🔵 LOW    | 16h    | Parked |

**Subtotal Phase 2**: 37h

---

### 🟠 **PHASE 3: PRODUCTION OPERATIONS (Week 3-4) — 63 hours**

**Impact**: Zero-downtime deployments, incident response, runbooks

| #    | Issue                                                                       | Severity  | Effort | Status |
| ---- | --------------------------------------------------------------------------- | --------- | ------ | ------ |
| #145 | Create production incident response runbook (alerts, failover, recovery)    | 🟠 HIGH   | 8h     | Parked |
| #146 | Add synthetic monitoring for production health (auth, API, webhooks)        | 🟠 HIGH   | 6h     | Parked |
| #147 | Document backup & recovery procedures (RTO/RPO targets)                     | 🟠 HIGH   | 4h     | Parked |
| #148 | Establish capacity planning & scaling strategy (DB, compute, CDN)           | 🟡 MEDIUM | 4h     | Parked |
| #149 | Implement real-time operational dashboard (users, AI usage, approval queue) | 🟡 MEDIUM | 12h    | Parked |
| #150 | Create Terraform/IaC for complete environment setup (Vercel, Supabase, CF)  | 🟡 MEDIUM | 20h    | Parked |
| #151 | Add automated dependency update workflow (Dependabot)                       | 🔵 LOW    | 3h     | Parked |
| #152 | Implement real payload size check (stream-based, not header-spoofable)      | 🟡 MEDIUM | 2h     | Parked |
| #153 | Add structured logging (remove console.log from source packages)            | 🔵 LOW    | 4h     | Parked |
| #154 | Document webhook agent failure handling (mark FAILED, not PROCESSED)        | 🟡 MEDIUM | 2h     | Parked |

**Subtotal Phase 3**: 65h

---

### 💎 **PHASE 4: PRODUCT EXCELLENCE (Month 2) — 74 hours**

**Impact**: Buyer delight, competitive advantage, market differentiation

#### Collaboration & UX

| #    | Issue                                                                    | Severity  | Effort | Status |
| ---- | ------------------------------------------------------------------------ | --------- | ------ | ------ |
| #155 | Implement real-time collaboration on sourcing runs (WebSocket + OT/CRDT) | 🔵 LOW    | 12h    | Parked |
| #156 | Add bulk evidence upload with drag-and-drop (auto-OCR for invoices)      | 🔵 LOW    | 6h     | Parked |
| #157 | Create sourcing run templates (reusable configurations)                  | 🔵 LOW    | 6h     | Parked |
| #158 | Add decision rationale editor for operators (WHY override?)              | 🟡 MEDIUM | 4h     | Parked |

#### Intelligence & Insights

| #    | Issue                                                                         | Severity  | Effort | Status |
| ---- | ----------------------------------------------------------------------------- | --------- | ------ | ------ |
| #159 | Implement smart recommendations engine (historical outcomes + market signals) | 🟡 MEDIUM | 16h    | Parked |
| #160 | Add comparative analysis: 3+ suppliers side-by-side (visual comparison table) | 🟡 MEDIUM | 10h    | Parked |
| #161 | Implement buyer feedback collection post-decision (accuracy survey)           | 🟡 MEDIUM | 8h     | Parked |
| #162 | Add buyer notification preferences (alerts, digest, opt-out)                  | 🔵 LOW    | 4h     | Parked |

#### Export & Mobility

| #    | Issue                                                             | Severity  | Effort | Status |
| ---- | ----------------------------------------------------------------- | --------- | ------ | ------ |
| #163 | Implement AI-generated executive summary (1-page PDF for C-suite) | 🟡 MEDIUM | 6h     | Parked |
| #164 | Create mobile app for buyer report view (React Native / Flutter)  | 🔵 LOW    | 24h    | Parked |

**Subtotal Phase 4**: 96h

---

### ⭐ **PHASE 5: DEVELOPER & ORGANIZATIONAL EXCELLENCE (Month 2-3) — 34 hours**

**Impact**: Attract talent, reduce onboarding time, build community

| #    | Issue                                                                       | Severity | Effort | Status |
| ---- | --------------------------------------------------------------------------- | -------- | ------ | ------ |
| #165 | Create comprehensive operator onboarding tutorial (interactive walkthrough) | 🔵 LOW   | 8h     | Parked |
| #166 | Build internal developer playground (sandboxed test environment)            | 🔵 LOW   | 6h     | Parked |
| #167 | Document ADR template (context, decision, alternatives, consequences)       | 🔵 LOW   | 2h     | Parked |
| #168 | Create video series: "How TradeOS Works" (5x 5-min videos)                  | 🔵 LOW   | 16h    | Parked |
| #169 | Setup internal community Slack channel for wins & learnings                 | 🔵 LOW   | 2h     | Parked |

**Subtotal Phase 5**: 34h

---

## 📊 Complete Roadmap Summary

| Phase     | Category        | # Issues  | Total Effort | Completion    |
| --------- | --------------- | --------- | ------------ | ------------- |
| **1**     | Critical Fix    | 12        | **20.5h**    | End of Week 1 |
| **2**     | Code Excellence | 8         | **37h**      | Week 2-3      |
| **3**     | Operations      | 10        | **65h**      | Week 3-4      |
| **4**     | Product         | 10        | **96h**      | Month 2       |
| **5**     | Organizational  | 5         | **34h**      | Month 2-3     |
| **TOTAL** | **45 Issues**   | **~250h** | **Q2 2026**  |

---

## 🎯 Success Metrics (Definition of "Hoàn Hảo")

When all 45 issues are complete:

✅ **Code Quality**

- Zero HIGH/CRITICAL bugs
- 95%+ test coverage on critical packages
- All API routes validated with Zod
- All migrations safe for production data
- Pre-commit gates enforce code standards

✅ **Security**

- MFA enforcement verified end-to-end
- Cross-tenant access tests pass
- No credential leaks in logs
- Webhook security hardened
- Secrets rotation documented

✅ **Operations**

- Production runbooks complete
- Synthetic monitoring active
- RTO/RPO targets defined
- Incident response tested
- IaC covers all infrastructure

✅ **Product**

- Real-time collaboration working
- Buyer feedback loops closing
- AI recommendations improving
- Mobile access available
- Executive dashboards available

✅ **Team**

- Onboarding time < 2 days
- Video series attracts talent
- Developer playground active
- Community engaged & contributing
- ADR process established

---

## 🚫 How Not to Use This File

1. Do not create the 45 issues before #125 and #124 are complete.
2. Do not treat the phases below as the active project board.
3. Do not use these ideas to override real buyer feedback.
4. Revisit only after the post-buyer retrospective identifies the next highest-leverage work.

---

## 📝 Example: First Active Issue Guidance

```
Title: Fix TypeScript errors in ai-core test suite (TS2345 x3)
Labels: bug, critical, blocked-ci
Assignee: [self-assign]

## Problem
Lines 230, 454, 556 in packages/ai-core/src/__tests__/agent-pipeline.test.ts fail with:
  error TS2345: Argument of type '...' is not assignable to type parameter

## Root Cause
Test mocks pass pendingApproval objects with incorrect Prisma shape.

## Solution
Do not force-cast Prisma models just to pass tests.

Prefer one of these fixes:
- use a typed factory for the test fixture
- narrow the function input type to the shape actually consumed by the code
- keep Prisma-generated model types at real Prisma boundaries only

## Verification
- pnpm typecheck passes
- All 3 error locations fixed
- No regressions in ai-core tests
```

---

## 🎓 Philosophy

**"Độc lập · Tự do · Hạnh phúc"**

This roadmap embodies three principles:

1. **Độc lập (Autonomy)**: Each phase is independent and can be parallelized
2. **Tự do (Freedom)**: Developers have clear ownership within phases
3. **Hạnh phúc (Joy)**: Celebrate shipping excellence, not just features

**Excellence is not perfection. Perfection is consistency.**

---

**Do not start from this file. Start from #125 → #124 → post-buyer retrospective.**

**That's how legendary systems are built.** 🏆

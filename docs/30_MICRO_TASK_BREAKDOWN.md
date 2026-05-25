# TradeOS Micro-Task Execution Plan

> Mỗi task là 1 atomic change. Chỉ chuyển task sau khi verify gate.

Legend: `[ ]` = pending, `[~]` = in progress, `[✓]` = done, `[x]` = blocked

---

## ✅ Done (not reopening)

| Issue                  | State                     |
| ---------------------- | ------------------------- |
| PR #3 merged           | `[✓]`                     |
| Issue #1 closed        | `[✓]`                     |
| #6 code + messages     | `[✓]` committed `fd514aa` |
| #4 real evidence count | `[✓]` committed `e5b60f3` |

---

## Gate 0 — No Production Claims Until Proof

> Depends on: having staging Supabase access and authenticated session.

### #11 — Staging Migration Proof (P0)

| #    | Micro-Task                                                  | Verify Gate                                 |
| ---- | ----------------------------------------------------------- | ------------------------------------------- |
| 11.1 | Run `pnpm db:generate` locally → confirm no drift           | `pnpm db:generate` exits 0, no changes      |
| 11.2 | Get staging Supabase DATABASE_URL                           | `[x] block: need credentials or ask user]`  |
| 11.3 | Run `pnpm db:push` or apply migrations on staging           | Migration exits 0                           |
| 11.4 | Run `pnpm db:seed` on staging                               | Seed exits 0, no duplicate key errors       |
| 11.5 | Verify migration `20260525_add_payment_external_id` applied | `SELECT * FROM _prisma_migrations` shows it |
| 11.6 | Write rollback notes for each unapplied migration           | Document in `docs/10_DEPLOYMENT_RUNBOOK.md` |
| 11.7 | Update `docs/13_CHECKPOINTS.md` with evidence               | CI URL + migration status documented        |

### #10 — Authenticated Staging Smoke (P0)

> Depends on: #11 complete, authenticated Supabase session in browser.

Smoke checklist from `docs/20_STAGING_SMOKE_TESTS.md`:

| #     | Micro-Task                              | Verify Gate                           |
| ----- | --------------------------------------- | ------------------------------------- |
| 10.1  | Login flow /auth/callback               | Redirects to dashboard, no error      |
| 10.2  | Dashboard loads with real data          | API calls return 200, charts render   |
| 10.3  | Create lead through UI                  | Lead appears in list, API returns 201 |
| 10.4  | Companies page loads                    | Table renders, search works           |
| 10.5  | Products page loads                     | Product list renders                  |
| 10.6  | Create quotation flow                   | Create → add line items → save        |
| 10.7  | Sourcing run create flow                | UI walkthrough, sourcing run created  |
| 10.8  | Webhook settings page works             | Settings load, test webhook fires     |
| 10.9  | AI agent test (if enabled)              | Agent returns response                |
| 10.10 | Settings page loads all tabs            | No 500 errors                         |
| 10.11 | Billing page loads with plan/usage      | Plan displayed, usage bars render     |
| 10.12 | Privacy export/download                 | Export triggers, file downloads       |
| 10.13 | Audit log page loads                    | Log entries visible                   |
| 10.14 | Demo auth toggle disabled (staging)     | `ALLOW_DEMO_AUTH=false` confirmed     |
| 10.15 | Record evidence (curl + URL)            | Screenshots + curl output saved       |
| 10.16 | Update `docs/20_STAGING_SMOKE_TESTS.md` | All 15 items marked ✓                 |
| 10.17 | Update `docs/13_CHECKPOINTS.md`         | CI green + smoke evidence documented  |

---

## Gate 1 — MoneyOS Correctness

> Start after Gate 0. Depends on: nothing from Gate 0 (can code while waiting for staging access).

### #6 — API Error Classification (P1) [M6]

| #    | Micro-Task                                                   | Verify Gate                                                                                   |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 6.1  | Create `apps/web/lib/__tests__/api-errors.test.ts`           | `[~]`                                                                                         |
| 6.2  | Test `classifyApiError` with auth errors (401)               | `classifyApiError("AUTH_REQUIRED").status === 401`                                            |
| 6.3  | Test `classifyApiError` with role/permission denied (403)    | `classifyApiError("ROLE_DENIED").status === 403`                                              |
| 6.4  | Test `classifyApiError` with MFA required (403)              | `classifyApiError("MFA_REQUIRED").status === 403`                                             |
| 6.5  | Test `classifyApiError` with legal hold (403)                | `classifyApiError("LEGAL_HOLD_ACTIVE").status === 403`                                        |
| 6.6  | Test `classifyApiError` with unknown action / 400            | `classifyApiError("UNKNOWN_ACTION").status === 400`                                           |
| 6.7  | Test `classifyApiError` with entitlement exceeded (402)      | `classifyApiError("ENTITLEMENT_EXCEEDED").status === 402`                                     |
| 6.8  | Test `classifyApiError` with not-found (404)                 | `classifyApiError("CHECKPOINT_NOT_FOUND").status === 404`                                     |
| 6.9  | Test `classifyApiError` with validation (400)                | `classifyApiError("_REQUIRED").status === 400`, `classifyApiError("_INVALID").status === 400` |
| 6.10 | Test `classifyApiError` with checkpoint billing (400)        | `classifyApiError("CHECKPOINT_EVIDENCE_REQUIRED").status === 400`                             |
| 6.11 | Test `classifyApiError` with webhook auth (401)              | `classifyApiError("WEBHOOK_INVALID_SIGNATURE").status === 401`                                |
| 6.12 | Test `classifyApiError` with org access denied (403)         | `classifyApiError("_BELONGS_TO_ANOTHER_ORGANIZATION").status === 403`                         |
| 6.13 | Test `classifyApiError` with `_ACCESS_DENIED` suffix (403)   | `classifyApiError("BILLING_ACCESS_DENIED").status === 403`                                    |
| 6.14 | Test `classifyApiError` with `_NOT_FOUND` suffix (404)       | `classifyApiError("LEAD_NOT_FOUND").status === 404`                                           |
| 6.15 | Test `classifyApiError` with `SyntaxError` (400)             | `classifyApiError("SyntaxError: Unexpected token").status === 400`                            |
| 6.16 | Test `classifyApiError` with unknown error (500)             | `classifyApiError("something random").status === 500`                                         |
| 6.17 | Test `getUserFacingError` returns Vietnamese for `vi` locale | Returns VI string, not EN                                                                     |
| 6.18 | Test `apiErrorResponse` returns correct shape                | Has `error`, `message`, `retryable`, `retryGuidance`                                          |
| 6.19 | Run test file                                                | `vitest run apps/web/lib/__tests__/api-errors.test.ts` passes                                 |
| 6.20 | Run `pnpm build`                                             | Build exits 0                                                                                 |

### #5 — Buyer Report Delivery + Evidence (P1) [M5]

| #   | Micro-Task                                                                                       | Verify Gate                                                 |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 5.1 | Update deliver-report `route.ts` to read JSON body instead of searchParams                       | Route accepts `POST` with `Content-Type: application/json`  |
| 5.2 | Pass risks/missingInformation/nextActions arrays from route body                                 | All schema fields reachable                                 |
| 5.3 | Update `deliverBuyerReportAction` to create `EvidenceItem` with `evidenceType: "BUYER_DECISION"` | Evidence record created in DB                               |
| 5.4 | Return `evidenceId` from action response                                                         | Response includes `evidenceId` field                        |
| 5.5 | Update unit test: verify evidence created                                                        | Test asserts `evidenceItem.create` called with correct args |
| 5.6 | Update unit test: verify evidenceId in response                                                  | Response includes `evidenceId`                              |
| 5.7 | Run tests                                                                                        | `pnpm --filter @tradeos/sourcing-core test` passes          |
| 5.8 | Run `pnpm routes:check`                                                                          | Route action parity confirmed                               |
| 5.9 | Run `pnpm build`                                                                                 | Build exits 0                                               |

### #7 — Real DB Integration Tests (P1) [M7]

> Depends on: staging Supabase DATABASE_URL.

| #   | Micro-Task                                                                      | Verify Gate                                              |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 7.1 | Add sourcing test cases to `packages/integration-tests/src/action-flow.test.ts` |                                                          |
| 7.2 | Test: sourcing run create with cross-org validation                             | Cross-org access throws error                            |
| 7.3 | Test: supplier candidate tenant isolation                                       | Wrong org cannot see candidate                           |
| 7.4 | Test: evidence-before-billing with real DB                                      | Checkpoint with evidence → approve; no evidence → reject |
| 7.5 | Test: payment idempotency (duplicate externalPaymentId)                         | Second call returns existing payment, no duplicate row   |
| 7.6 | Test: buyer report delivery with evidence                                       | `BUYER_DECISION` evidence created                        |
| 7.7 | Run integration tests                                                           | `RUN_INTEGRATION_TESTS=true pnpm test` passes            |
| 7.8 | Document test results in checkpoint                                             | Evidence of passing integration tests                    |

### #13 — Monetization UI/API (P1) [M13]

| #    | Micro-Task                                                   | Verify Gate                                         |
| ---- | ------------------------------------------------------------ | --------------------------------------------------- |
| 13.1 | Add loading skeleton to billing page                         | Skeleton shows during fetch                         |
| 13.2 | Add proper error states for plan upgrade failure             | Error banner on 402/403                             |
| 13.3 | Add confirmation dialog for plan change                      | Dialog before PATCH                                 |
| 13.4 | Add invoice history placeholder component                    | Invoice list renders (empty state if none)          |
| 13.5 | Map entitlement errors in billing UI to user-facing messages | Error from `checkEntitlement` renders friendly text |
| 13.6 | Create payment history API endpoint                          | `GET /api/organization/billing/payments`            |
| 13.7 | Add payment history list to billing page                     | Payment table renders                               |
| 13.8 | Run build                                                    | Build exits 0                                       |

---

## Gate 2 — Tenant, Permission, E2E

### #12 — Authenticated E2E Suite (P1) [M12]

> Depends on: Playwright/Cypress setup. First-time setup needed.

| #    | Micro-Task                                     | Verify Gate                 |
| ---- | ---------------------------------------------- | --------------------------- |
| 12.1 | Choose E2E framework (Playwright recommended)  | Installed in apps/web       |
| 12.2 | Create test: login flow                        | Redirects to dashboard      |
| 12.3 | Create test: create lead                       | Lead appears in list        |
| 12.4 | Create test: sourcing run create               | Run created with UI         |
| 12.5 | Create test: billing page loads                | Plan/usage displayed        |
| 12.6 | Create test: VIEWER cannot access billing mgmt | Button hidden or 403        |
| 12.7 | Create test: demo auth disabled on staging     | 401 on demo login           |
| 12.8 | Create test: multi-org isolation               | User sees only own org data |
| 12.9 | Run E2E suite                                  | All tests green in CI       |

### #14 — RBAC v2 Permission Gates (P1) [M14]

> Large effort. Broken into 3 sub-phases.

**Phase A — Database**

| #     | Micro-Task                                          | Verify Gate         |
| ----- | --------------------------------------------------- | ------------------- |
| 14A.1 | Add `OrganizationMember` model to Prisma schema     | Migration generates |
| 14A.2 | Add `Role` + `Permission` + `RolePermission` models | Migration generates |
| 14A.3 | Add `Invitation` model                              | Migration generates |
| 14A.4 | Run `pnpm db:generate`                              | Schema compiles     |
| 14A.5 | Seed default roles and permissions                  | Seed runs clean     |

**Phase B — Resolver**

| #     | Micro-Task                                            | Verify Gate                         |
| ----- | ----------------------------------------------------- | ----------------------------------- |
| 14B.1 | Update `resolveSessionFromEmail()` for multi-org      | Returns permissions for current org |
| 14B.2 | Build `assertPermission()` caching                    | No duplicate DB calls               |
| 14B.3 | Migrate routes from `assertRole` → `assertPermission` | Routes still work                   |
| 14B.4 | Test: permission denied → 403                         | Perm test passes                    |

**Phase C — UI**

| #      | Micro-Task                                    | Verify Gate                               |
| ------ | --------------------------------------------- | ----------------------------------------- |
| 14C.1  | Build `PermissionGate` component              | Component renders conditionally           |
| 14C.2  | Build workspace switcher (multi-org dropdown) | Switch org → reloads with new permissions |
| 14C.3  | Build Settings: Team tab                      | Member list + invite form                 |
| 14C.4  | Build Settings: Roles tab                     | Role list with permission checkboxes      |
| 14C.5  | Build Settings: Security tab                  | MFA toggle, session management            |
| 14C.6  | Build Settings: Integrations tab              | Webhook config                            |
| 14C.7  | Build Settings: AI tab                        | Agent config                              |
| 14C.8  | Build Settings: Notifications tab             | Notification prefs                        |
| 14C.9  | Build Settings: Audit tab                     | Audit log viewer                          |
| 14C.10 | Build invitation flow (email + accept)        | Invite → accept → member added            |

### #16 — Procurement UX Hardening (P1) [M16]

| #    | Micro-Task                                          | Verify Gate                             |
| ---- | --------------------------------------------------- | --------------------------------------- |
| 16.1 | Add loading/error/empty states to sourcing run list | All states render                       |
| 16.2 | Add sourcing run form validation                    | Required fields validated before submit |
| 16.3 | Add evidence ledger component                       | Evidence items listed per checkpoint    |
| 16.4 | Add mobile-responsive layout for sourcing pages     | Resize < 768px: layout adapts           |
| 16.5 | Add confirmation dialogs for destructive actions    | Delete/approve requires confirm         |
| 16.6 | Run build                                           | Build exits 0                           |

---

## Gate 3 — AI & Automation Safety

### #17 — AI Procurement Safety Evals (P1) [M17]

| #    | Micro-Task                                                             | Verify Gate                                |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------ |
| 17.1 | Run golden eval dataset against real LLM (not mocked)                  | Eval script runs, results logged           |
| 17.2 | Test: AI blocked from executing `sourcing.deliverBuyerReport` directly | Execute fails with approval required       |
| 17.3 | Test: AI blocked from executing `checkpoint.approveForBilling`         | Execute fails with approval required       |
| 17.4 | Test: ambiguous sourcing intent creates handover                       | Handover record created                    |
| 17.5 | Fix any eval failures                                                  | All golden scenarios pass                  |
| 17.6 | Document eval results in checkpoint                                    | Eval run documented with model/config/date |

### #19 — Webhook Production Readiness (P1) [M19]

| #    | Micro-Task                         | Verify Gate                        |
| ---- | ---------------------------------- | ---------------------------------- |
| 19.1 | Signed webhook success smoke test  | Webhook received, processed        |
| 19.2 | Invalid signature test             | Webhook rejected with 401          |
| 19.3 | Duplicate idempotency test         | Same idempotency key → same result |
| 19.4 | Webhook retry end-to-end test      | Retry succeeds after failure       |
| 19.5 | Webhook archive processor test     | Old webhooks archived              |
| 19.6 | Webhook integration UI in settings | List webhooks, add/remove endpoint |
| 19.7 | Run build                          | Build exits 0                      |

---

## Gate 4 — Operating Company Readiness

### #15 — Observability & SLO Gate (P1) [M15]

| #    | Micro-Task                                          | Verify Gate                            |
| ---- | --------------------------------------------------- | -------------------------------------- |
| 15.1 | Add request ID to all API responses                 | Response header `X-Request-Id` present |
| 15.2 | Add structured logging with tenant + action context | Logs show orgId, action, userId        |
| 15.3 | Create SLO monitoring dashboard                     | Dashboard URL documented               |
| 15.4 | Add latency budget monitoring                       | p95 < 500ms alert configured           |
| 15.5 | Add rate-limit monitoring                           | >100 rpm alert configured              |
| 15.6 | Document runbooks for common failures               | Runbook in docs/                       |

### #18 — Data Governance Proof (P1) [M18]

| #    | Micro-Task                               | Verify Gate                         |
| ---- | ---------------------------------------- | ----------------------------------- |
| 18.1 | Test evidence immutability (append-only) | Update evidence item → throws error |
| 18.2 | Test privacy export produces valid JSON  | Export file downloadable            |
| 18.3 | Test anonymization removes PII correctly | PII fields nulled, audit preserved  |
| 18.4 | Test legal hold prevents anonymization   | Legal hold org: anonymize blocked   |
| 18.5 | Document retention policy                | Retention period documented         |
| 18.6 | Document DPA compliance notes            | DPA section in docs/                |

### #9 — PlanLimit Strategy (P2) [M9]

| #   | Micro-Task                                            | Verify Gate                |
| --- | ----------------------------------------------------- | -------------------------- |
| 9.1 | Decide: hardcoded constants vs DB-driven              | ADR written with rationale |
| 9.2 | If DB-driven: ensure seed data covers all plan tiers  | Seed CI-tested             |
| 9.3 | If hardcoded: document tier limits in one source file | Single source of truth     |
| 9.4 | Document in checkpoint                                | Decision recorded          |

---

## Execution Notes

### Parallelism

- **M6** (api-errors test) and **M5** (buyer report) can run in parallel — no file conflicts.
- **M7** (integration tests), **M10**, **M11** require staging DB access. Code them but run only when DB is available.
- **M14** (RBAC v2) is largest — split across 3 sub-phases. Each sub-phase is independently verifiable.

### Blockers to flag

- `[x] staging DB access` — blocks #11, #10, #7
- `[x] authenticated staging session` — blocks #10 smoke items 10.1–10.14
- `[x] E2E framework choice` — blocks #12
- `[x] real LLM API key` — blocks #17.1

### One Rule

> **Không chuyển task mới nếu chưa verify gate của task hiện tại.**
> Nghĩa là: code xong → chạy test → build → update checkpoint → CHỈ SAU ĐÓ mới next.

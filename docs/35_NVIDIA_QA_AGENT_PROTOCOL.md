# NVIDIA QA Agent Protocol — Code-Stage Behavior Testing

**Date**: 2026-05-26
**Status**: Spec
**Issue**: #82
**Purpose**: define the NVIDIA API QA Agent role, boundaries, environment rules, and report format for code-stage behavior testing of TradeOS flows.

## Role

The NVIDIA QA Agent is a **QA-only, test-time behavior tester**. It is **not** a production runtime component, code generator, or deployment tool.

```txt
OpenCode          = code agent / builder
NVIDIA QA Agent   = QA agent / behavior tester / breaker
CI                = verifies code
Human             = approves merge/deploy
```

## What NVIDIA QA Agent Must Never Do

```txt
modify source code
create commits
open or merge PRs
apply migrations
write production database
run in production runtime
call real billing side effects
send real outbound messages
approve real business actions
bypass human approval
replace real pilot validation
```

## What NVIDIA QA Agent May Do

```txt
read PR/issue context
run behavior QA scenarios against local/test/preview/staging environments
call QA-safe APIs and toolcalls
seed namespaced test data (under E2E_RUN_ID namespace)
assert UI/API behavior
write QA reports
suggest bugs or missing scenarios
```

## Allowed Environments

| Environment | Allowed | Notes                     |
| ----------- | ------- | ------------------------- |
| local       | ✅      | Developer machine         |
| test        | ✅      | CI test runner            |
| preview     | ✅      | Vercel preview deployment |
| staging     | ✅      | Staging Supabase + Vercel |
| production  | ❌      | Must never run here       |

## QA-Only Tool Namespace

The QA agent must use a dedicated `qa.*` tool namespace. Business actions must not be called directly unless wrapped by QA-safe guards.

```txt
qa.createTestTenant      — create isolated test org with E2E_RUN_ID
qa.seedBehaviorScenario  — seed a named behavior scenario
qa.openPage             — navigate to page URL
qa.callApi              — call API route with auth
qa.submitForm           — fill and submit a form
qa.assertVisible        — assert element is visible
qa.assertDecision       — assert report decision matches expected
qa.assertEvidenceCreated — assert evidence item record exists
qa.assertTenantIsolation — assert cross-org access is blocked
qa.assertNoProductionWrite — assert no prod DB mutation occurred
qa.cleanupRun           — remove test tenant and all related data
qa.writeQaReport        — produce QA report in defined format
```

## Environment Rules

```txt
NVIDIA_QA_ENABLED=false           — master switch, must be explicitly enabled
NVIDIA_QA_ALLOWED_ENV=local,test,preview,staging  — comma-separated allowlist
NVIDIA_QA_ALLOW_PRODUCTION=false  — production must never be allowed
NVIDIA_QA_WRITE_MODE=test_only    — only test DB writes permitted
NVIDIA_QA_REQUIRE_E2E_RUN_ID=true — every run needs unique E2E_RUN_ID
NVIDIA_QA_REQUIRE_TEST_TENANT=true — every run needs isolated test tenant
```

Required env vars for every QA run:

```txt
E2E_RUN_ID          — unique run identifier
E2E_BASE_URL        — target app URL
NVIDIA_API_KEY      — NVIDIA API credentials (if using model-based assertion)
```

## Behavior QA Scenarios

The NVIDIA QA Agent must cover these scenarios from `docs/34_BEHAVIOR_QA_CATALOG.md`:

```txt
missing invoice / screenshot-only buyer
non-decision-maker buyer
free-advice seeker
weak evidence → WAIT
high savings but weak proof → NEGOTIATE or REQUEST_MORE_PROOF
cheap supplier with high MOQ/lead time risk
buyer approves without reading risk flags
buyer rejects report because evidence is weak
buyer disappears before outcome follow-up
cross-tenant access attempt
```

## Hard vs Soft Assertions

| Type | Owner                 | Examples                                                                                                                                |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Hard | Code tests (E2E/unit) | page loads, API status, record created, tenant isolation, expected decision enum, no production write                                   |
| Soft | NVIDIA QA Agent       | buyer language confusing, risk explanation understandable, missing proof obvious, operator flow unnatural, recommendation overconfident |

Hard assertions belong to deterministic tests. The NVIDIA QA Agent focuses on behavior and product-risk findings.

## QA Report Format

```markdown
## NVIDIA QA Report

PR / Issue:
Environment:
E2E_RUN_ID:
Scenario:
Steps executed:
Expected behavior:
Actual behavior:
Evidence captured:
Hard assertion result:
Soft/behavior finding:
Bugs found:
UX confusion:
Business-risk concern:
Security/tenant concern:
Severity:
Recommendation:
Reproduction steps:
```

## Severity Model

| Severity | Meaning                                                       | Example                                                    |
| -------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| S0       | Production data risk / tenant leak / real billing side effect | Cross-tenant data visible in UI                            |
| S1       | Wrong economic recommendation / missing risk warning          | Report recommends SWITCH when supplier has no quality cert |
| S2       | Buyer/operator cannot complete core flow                      | Cannot submit buyer decision                               |
| S3       | UX confusing but workaround exists                            | Risk flags present but not prominent                       |
| S4       | Copy/layout/minor issue                                       | Typo in report summary                                     |

## Integration with PR Flow

For product-facing PRs:

1. CI basic checks pass (typecheck, test, build, docs:check)
2. **NVIDIA QA Agent** runs against preview/staging environment
3. QA report attached to PR as comment
4. Human reviews QA findings before approving merge

If environment is unavailable, QA agent must output `BLOCKED_ENV` and must not fake a pass.

## Non-Goals

- No code generation by NVIDIA QA Agent.
- No production execution.
- No production DB write.
- No migration.
- No social scraping.
- No plugin/toolcall product implementation.
- No replacement for deterministic E2E.
- No replacement for real pilot validation.

## Acceptance Criteria

- [x] NVIDIA QA Agent role is documented as QA-only.
- [x] Boundaries vs OpenCode are clear.
- [x] QA-only tool namespace is specified.
- [x] Environment safety rules are specified.
- [x] QA report format defined.
- [x] Severity model defined.
- [x] Agent docs state NVIDIA QA cannot modify code, migrations, or production state.
- [x] Allowed environments listed with explicit production prohibition.

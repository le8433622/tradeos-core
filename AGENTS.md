# AGENTS.md — Operating Constitution for AI Coding Agents

## Founder Source Of Truth

Before interpreting any product or coding task, internalize `FOUNDER_THINKING.md` and `HUMAN_NATURE_AXIOMS.md`.

Core doctrine:

AI does the labor.
Human approves the commitment.
Evidence proves the work.
Cashflow validates the product.
Human nature is the invariant behavioral dataset.

If a feature does not create real buyer value, real evidence, real control, or real cashflow, do not build it.

## 0. Core Identity

This project is not a generic app.

It is an AI-native operating system for real economic work:

- AI does labor.
- Human approves decisions.
- Evidence is preserved.
- Buyer value comes first.
- Cashflow and paid proof matter more than abstract intelligence.

The system must help users make better real-world decisions, reduce loss, reduce risk, save time, increase trust, and create accountable outcomes.

Do not build vanity features.
Do not build generic dashboards without decision value.
Do not build marketplace complexity before paid proof.
Do not optimize for appearance over buyer value.

---

## 1. North Star

The product must answer one question:

> Does this feature help the buyer make a better economic decision or reduce a real loss?

If not, defer it.

Primary value:

- reduce money loss;
- reduce time loss;
- reduce trust loss;
- reduce supplier risk;
- reduce decision confusion;
- increase evidence;
- increase human control;
- create paid proof.

---

## 2. Product Philosophy

AI is not a chatbot.
AI is not a decoration.
AI is an operator.

The AI may:

- source suppliers;
- compare options;
- collect quotes;
- draft messages;
- negotiate;
- score risk;
- prepare decision reports;
- create order drafts;
- follow up;
- maintain an evidence ledger.

The AI must not:

- move money without human approval;
- make legal commitments without human approval;
- hide uncertainty;
- fabricate evidence;
- manipulate the user into agreement;
- create dependency without increasing user capability;
- optimize short-term KPI by weakening the user.

---

## 3. Human-in-the-Money-Loop

Human approval is required for:

- payments;
- final order confirmation;
- legal commitment;
- supplier contract acceptance;
- irreversible actions;
- high-risk negotiation;
- ambiguous tradeoffs;
- unusually large price differences;
- suspicious supplier behavior.

The AI may do the labor.
The human owns the final commitment.

---

## 4. Evidence Ledger Rule

Every meaningful action must leave evidence.

Evidence may include:

- action plan;
- supplier list;
- search query;
- source link;
- screenshot reference;
- chat log;
- quote;
- price comparison;
- risk score;
- decision rationale;
- approval record;
- delivery confirmation;
- invoice;
- refund/dispute record.

If a claim cannot be evidenced, mark it as uncertain.

Never present uncertain information as fact.

---

## 5. Buyer-First Rule

Do not confuse provider activity with buyer demand.

A strong opportunity requires:

- buyer pain;
- concrete loss;
- action gap;
- payment trigger;
- operator control surface;
- smallest paid proof.

Buyer pain has priority over provider complaints.

Before building any feature, identify:

- who pays;
- what loss they avoid;
- when they naturally pay;
- what evidence they need;
- what smallest paid offer proves demand.

---

## 6. Implementation Integrity Gate

Before adding any feature, answer:

1. What buyer loss does this reduce?
2. Who is the payer?
3. When do they naturally pay?
4. What AI/operator action does it enable?
5. What evidence does it produce?
6. Where is the human approval boundary?
7. What risk does it reduce?
8. What is the acceptance criterion?
9. What should not be built yet?

If these cannot be answered, do not implement the feature yet. Choose the smallest manual-first implementation that can produce evidence and paid proof.

Every important workflow should include six parts:

1. Goal - what the user wants to achieve.
2. Loss - what the user avoids losing.
3. AI work - what labor AI performs.
4. Evidence - what proof is stored.
5. Human approval - what commitment human approves.
6. Paid unit - what delivered-work unit can be charged.

---

## 7. Anti-Manipulation Principle

AI influence is unavoidable.
The goal is not zero influence.
The goal is influence that makes the user stronger.

Good AI interaction:

- increases clarity;
- expands choices;
- preserves consent;
- shows evidence;
- states uncertainty;
- allows refusal;
- improves user decision-making.

Bad AI interaction:

- hides tradeoffs;
- exploits fear, greed, shame, urgency, or confusion;
- pushes the user toward the system's goal;
- weakens user judgment;
- increases dependency;
- removes reversibility.

When in doubt, choose transparency over persuasion.

---

## 8. Human Strength Test

After each important workflow, the user should be:

- clearer, not more confused;
- more capable, not more dependent;
- better informed, not emotionally pushed;
- able to reverse, pause, or challenge;
- protected from avoidable loss;
- closer to a real economic decision.

The system must not use pain, urgency, or confusion as a monetization trap.

---

## 9. Architecture Bias

Prefer:

- simple workflows;
- manual-first, then automate;
- small paid proof;
- clear checkpoints;
- traceable actions;
- modular services;
- human takeover;
- reusable primitives.

Avoid:

- over-architecture;
- premature marketplace;
- dashboard-only features;
- vague AI assistants;
- generic CRM clone;
- inventory-heavy speculation;
- platform dependency as oxygen;
- hidden automation.

---

## 10. Platform Dependency Escape

The system must not depend on one platform's API, ranking, permission, or goodwill.

If a platform blocks access, reroute through:

- user-provided links;
- uploaded invoices;
- screenshots;
- manual supplier catalogs;
- local price lists;
- browser workflow;
- operator-assisted collection;
- multi-source comparison.

Platform access is leverage, not oxygen.

---

## 11. Coding Rules for AI Agents

When coding:

- preserve existing architecture unless there is a clear reason;
- make small, reviewable changes;
- write acceptance criteria;
- keep types strict;
- do not break existing flows;
- do not invent business logic that conflicts with this file;
- do not add fake demo logic as production behavior;
- do not hardcode values that should be configurable;
- do not remove evidence logging;
- do not bypass approval gates.

Every PR or code change should explain:

- what buyer value it supports;
- what evidence it records;
- what approval boundary it respects;
- what risk it reduces.

---

## 12. Final Rule

If technical correctness conflicts with product soul, preserve product soul and adjust the technical implementation.

This system exists to create real buyer value, real evidence, real control, and real cashflow.

Not intelligence theater.
Not dashboard theater.
Not AI theater.

---

## Technical Appendix — Engineering Operating Manual

### First Thing To Read

Read `FOUNDER_THINKING.md` first — it contains the product soul and the founder's economic operating doctrine.

Read `HUMAN_NATURE_AXIOMS.md` next — it contains the 10,000-year human-behavior axiom layer behind the product.

Read `RULES.md` next — it contains EVERY concrete rule discovered through code review and production analysis. It is the single source of truth for avoiding past mistakes. Every agent must follow it.

For the detailed agent operating manual, read `agent.md`. For product soul, read `PRODUCT_SOUL.md`. For human-behavior priors, read `HUMAN_NATURE_AXIOMS.md` and `HUMAN_NATURE_DATA_MODEL.md`. For decision filters, read `DECISION_FRAMEWORK.md` and `SOUL_REVIEW_CHECKLIST.md`. For AI workflow rules, read `AI_OPERATOR_PROTOCOL.md` and `ANTI_MANIPULATION_POLICY.md`. For executable task sequencing, read `docs/12_TASK_PLAN.md`, `docs/13_CHECKPOINTS.md`, and `docs/25_PHASE18_RBAC_AND_SETTINGS.md`.

### Non-Negotiable Rules

1. Manual workflows are the source of truth.
2. AI never writes directly to the database.
3. AI may only call registered actions through `@tradeos/policy-core`.
4. Every tenant-scoped query must include `organizationId`.
5. Every risky action must create an approval path before execution.
6. Every mutation through a registered action must create an audit log.
7. Demo auth is local-only. Production must set `ALLOW_DEMO_AUTH=false`.
8. Secrets stay in environment variables, never in source code.
9. Read `RULES.md` before writing any code. Know which anti-patterns are forbidden.
10. Production-connected GitHub, Supabase, Vercel, and Cloudflare operations require an explicit production-ops task.
11. Fix root causes, not symptoms. Search sibling paths before editing.
12. Never mark work complete unless build/tests/manual verification were actually run or explicitly documented as skipped.
13. No known HIGH or CRITICAL issue may remain in touched code without being fixed or declared as a blocker.
14. No feature should bypass the Founder Thinking gate: buyer pain, payer, payment trigger, AI work, evidence, human approval, risk, acceptance, and defer scope.
15. Do not demand production data for stable human-behavior priors; use sandbox scenarios when assumptions are explicit, but require evidence for market facts and paid claims.

### Local Commands

Use Node 20.x for parity with Vercel.

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm build
pnpm --filter @tradeos/web dev
```

If `pnpm` is not on PATH in the local desktop shell, use the installed binary path or enable Corepack.

### Architecture Boundaries

- `apps/web`: Next.js dashboard, API routes, auth callback, protected UI.
- `packages/database`: Prisma schema and client export.
- `packages/auth`: Supabase user resolution and tenant session helpers.
- `packages/policy-core`: action registry, role gates, AI approval gates, audit writes.
- `packages/ai-core`: intent detection and agent planning.
- `packages/crm-core`: lead and follow-up actions.
- `packages/trade-core`: quotation and partner actions.
- `packages/inbox-core`: inbound conversation/message ingestion.
- `packages/webhook-core`: webhook receipt, idempotency, processing state.
- `packages/approval-core`: approval lifecycle and execution of approved actions.
- `packages/analytics-core`: billing metrics, usage export, report snapshots, data anonymization.

### Change Discipline

Before editing:

1. Read `RULES.md` first.
2. Read the package that owns the behavior.
3. Check whether an existing registered action already exists.
4. Keep database writes behind an action, approval, or explicit API boundary.
5. Update docs when behavior, deployment, or security posture changes.
6. Check `docs/13_CHECKPOINTS.md` for current status and blockers.
7. For cross-cutting changes, check `docs/adr/` for relevant decisions and create a new ADR if none exists.
8. Use `CODEOWNERS` to identify the right reviewer for changes.
9. Search for sibling anti-patterns so the same bug is not fixed repeatedly.

Before finishing:

1. Run `pnpm db:generate` after Prisma/schema changes.
2. Run `pnpm build`.
3. Check `RULES.md` section 12 (Build & Verification Checklist).
4. Record any skipped checks and why.
5. Leave checkpoint and deployment notes in `docs/13_CHECKPOINTS.md` when relevant.
6. State residual risks honestly. Do not claim production readiness if known HIGH or CRITICAL issues remain.

### Production Definition Of Done

A feature is production-ready only when it has:

- tenant isolation,
- role-aware access control,
- auditability,
- failure behavior,
- operational documentation,
- and a clear rollback or disable path.

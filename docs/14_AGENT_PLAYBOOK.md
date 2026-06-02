# Agent Playbook Reference

The canonical playbook is the root `agent.md`. This document gives task prompts and operating patterns for autonomous coding agents.

Before using any prompt in this file, read root `FOUNDER_THINKING.md`, `HUMAN_NATURE_AXIOMS.md`, `HUMAN_NATURE_DATA_MODEL.md`, and `SOUL_REVIEW_CHECKLIST.md`.

## Default Agent Prompt

```txt
Read FOUNDER_THINKING.md first. Then read HUMAN_NATURE_DATA_MODEL.md, RULES.md, AGENTS.md, agent.md, PRODUCT_SOUL.md, DECISION_FRAMEWORK.md, SOUL_REVIEW_CHECKLIST.md, docs/13_CHECKPOINTS.md, and the relevant task in docs/12_TASK_PLAN.md.

Implement only the active task.

Before coding, answer internally:
1. Buyer pain:
2. Payer:
3. Payment trigger:
4. AI/operator action:
5. Evidence produced:
6. Human approval boundary:
7. Risk reduced:
8. Acceptance criteria:
9. What should not be built yet:

Do not change production infrastructure.
Do not bypass policy-core.
Do not hardcode organizationId.
Do not let AI write directly to the database.
Never use global prisma inside action handlers — always use db(context).
Do not build generic CRM/dashboard/chatbot/marketplace features unless they directly reduce buyer loss, produce evidence, preserve human control, or connect to paid proof.
Do not demand production data for stable human-behavior priors; use sandbox scenarios when assumptions are explicit. Require evidence for market facts, supplier facts, reliability facts, legal claims, and paid-proof validation.

Before finishing, run required checks, update docs/13_CHECKPOINTS.md when status changes, and summarize changed files plus verification.
```

## Code Task Prompt Template

```txt
Task ID:
Task title:

Goal:

Buyer pain:

Payer:

Payment trigger:

AI/operator action:

Evidence produced:

Human approval boundary:

Risk reduced:

What should not be built yet:

Files to read first:

Files allowed to edit:

Forbidden:

Acceptance criteria:

Required verification:

Rollback notes:
```

## Production Ops Prompt Template

```txt
Production operation requested:

Target system:
Environment:
Exact command(s):
Expected effect:
Risk:
Rollback path:
Verification:

Do not proceed unless the task explicitly authorizes this production operation.
```

## Review Checklist For Agents

Before reporting complete:

1. Did I read the current checkpoint?
2. Did I stay within the task scope?
3. Did I avoid unrelated worktree changes?
4. Did every tenant query include `organizationId`?
5. Did AI-related code avoid direct Prisma calls?
6. Did risky actions create approval paths?
7. Did registered mutations write audit logs?
8. Did I run required verification?
9. Did I record skipped checks?
10. Did I update the checkpoint when relevant?
11. Did the change reduce buyer loss or produce evidence?
12. Did the change preserve human approval for money/legal/final-order/irreversible actions?
13. Did the change avoid generic product drift?

## Stop Conditions

Stop and ask when:

- production data may be changed
- production deployment may occur
- migration can break existing data
- auth or tenant isolation is ambiguous
- AI permission boundary is unclear
- marketplace scope is requested before readiness criteria
- secrets appear in files or logs
- buyer pain, payer, evidence, or approval boundary is unclear
- automation is requested before manual workflow truth exists

## Preferred Implementation Style

1. Smallest correct change.
2. Package owns domain logic.
3. API route stays thin.
4. UI follows existing design unless task asks for redesign.
5. Validation fails closed.
6. Errors are explicit but do not leak secrets.
7. New abstractions require repeated need or explicit task requirement.
8. Docs update when behavior, deployment, or security posture changes.
9. Founder Thinking beats feature imagination.
10. Manual-first beats premature automation.

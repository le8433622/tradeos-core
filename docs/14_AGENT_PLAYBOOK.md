# Agent Playbook Reference

The canonical playbook is the root `agent.md`. This document gives task prompts and operating patterns for autonomous coding agents.

## Default Agent Prompt

```txt
Read RULES.md first. Then read AGENTS.md, agent.md, docs/13_CHECKPOINTS.md, and the relevant task in docs/12_TASK_PLAN.md.

Implement only the active task.

Do not change production infrastructure.
Do not bypass policy-core.
Do not hardcode organizationId.
Do not let AI write directly to the database.
Never use global prisma inside action handlers — always use db(context).

Before finishing, run required checks, update docs/13_CHECKPOINTS.md when status changes, and summarize changed files plus verification.
```

## Code Task Prompt Template

```txt
Task ID:
Task title:

Goal:

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

## Stop Conditions

Stop and ask when:

- production data may be changed
- production deployment may occur
- migration can break existing data
- auth or tenant isolation is ambiguous
- AI permission boundary is unclear
- marketplace scope is requested before readiness criteria
- secrets appear in files or logs

## Preferred Implementation Style

1. Smallest correct change.
2. Package owns domain logic.
3. API route stays thin.
4. UI follows existing design unless task asks for redesign.
5. Validation fails closed.
6. Errors are explicit but do not leak secrets.
7. New abstractions require repeated need or explicit task requirement.
8. Docs update when behavior, deployment, or security posture changes.

# ADR 0003: Production Operations Require Explicit Tasks

## Status

Accepted

## Context

The local environment may be authenticated to GitHub, Supabase, Vercel, and Cloudflare. These CLIs can affect production code, production data, DNS, routing, security rules, and customer access.

Autonomous agents should be able to inspect and build safely, but must not accidentally deploy, migrate, delete, purge, or reconfigure production resources.

## Decision

Production-impacting operations require an explicit production-ops task. The agent must state the command, target, expected effect, rollback path, and verification before executing.

## Production-Impacting Operations

- pushing commits or tags
- creating or merging PRs
- running production database migrations
- changing Supabase auth, RLS, storage, or secrets
- deploying Vercel production
- changing Cloudflare DNS, WAF, cache, workers, or page rules
- rotating secrets
- deleting tenant data

## Consequences

Positive:

- prevents accidental production changes
- creates audit-friendly operational notes
- makes rollback planning mandatory

Negative:

- production changes require more ceremony
- fully autonomous deploys are intentionally constrained

## Required Production Task Shape

```md
Target:
Environment:
Command:
Expected effect:
Risk:
Rollback:
Verification:
Approval:
```

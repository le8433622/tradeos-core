# Production State — TradeOS Core

**Last updated**: 2026-05-26
**Status**: Not yet production 10/10. This file tracks the live state required before schema migrations or production operations.

## Current Production Commit

(Record the git commit hash of the current production deployment.)

## Vercel Deployment

- **URL**: `https://tradeos-core.vercel.app`
- **Latest deployment ID**: (record from Vercel dashboard)
- **Status**: (READY / BUILDING / ERROR)
- **Health endpoint**: `/api/health` → (200 / non-200)

## Supabase

- **Project ref**: `ulnjanlaehfmxurreibj`
- **Current migration version**: (run `prisma migrate status` against target DB)
- **Pending migrations**: (list migration files not yet applied)
- **Last backup**: (date of pg_dump or Supabase snapshot)

## Feature Flags / Kill Switches

| Flag                           | Value              |
| ------------------------------ | ------------------ |
| `AI_EXECUTION_ENABLED`         | false              |
| `EXTERNAL_TOOLCALL_ENABLED`    | false              |
| `WEBHOOK_PROCESSING_ENABLED`   | false              |
| `WORKER_CONSUMING_ENABLED`     | false              |
| `BILLING_SIDE_EFFECTS_ENABLED` | false              |
| `PLUGIN_EXECUTION_ENABLED`     | false              |
| `ALLOW_DEMO_AUTH`              | false (production) |

## Migration History

| Date | Migration | Applied By | Status |
| ---- | --------- | ---------- | ------ |
|      |           |            |        |

## Last Smoke Test

- **Date**:
- **Result**:
- **Details**: (link to checkpoint entry or test output)

## Last Rollback Point

- **Commit hash**:
- **Vercel deployment ID**:
- **Date**:

## Residual Issues

- (list any known HIGH or CRITICAL issues that block production readiness)

## Next Action

- (what must happen before the next production operation)

# TradeOS Plan, Tasks, And Checkpoints

Canonical split introduced on 2026-05-21:

- Use `docs/12_TASK_PLAN.md` for the executable task plan.
- Use `docs/13_CHECKPOINTS.md` for the current checkpoint log.
- Keep this file as the legacy combined checkpoint reference until all agents have migrated.

## Current Checkpoint

Date: 2026-05-20

Status:

- repo cloned locally
- dependencies installed with `pnpm@10.11.0`
- Prisma Client generated
- production build passes locally
- Vercel build command updated to generate Prisma before Next build

Known local caveat:

- local shell is Node `v26.0.0`; repo and Vercel target Node `20.x`
- local commands emitted an engine warning but build completed

## Completed Fixes

1. Added missing `@supabase/supabase-js` dependency to `@tradeos/web`.
2. Imported `PrismaClient` before constructing the shared Prisma client.
3. Made `registerAction` generic so typed action packages compile.
4. Typed inbox metadata as `Prisma.InputJsonValue`.
5. Updated Vercel `buildCommand` to run `pnpm db:generate` before building the web app.

## Immediate Deployment Checklist

1. Confirm Vercel project env vars:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `ALLOW_DEMO_AUTH=false`
   - `WEBHOOK_SECRET`
   - `JWT_SECRET`
   - `APP_URL`
2. Run database migration against Supabase:
   - `pnpm db:generate`
   - `pnpm db:migrate`
3. Seed or create first tenant:
   - one `Organization`
   - one mapped `User.email` matching Supabase Auth
4. Deploy Vercel preview.
5. Validate:
   - `/api/health`
   - `/login`
   - `/`
   - `/leads`
   - `/approvals`
   - webhook intake route with a signed request

## Phase 0: Foundation Hardening

Goal: make the current MVP safe to demo with real pilot data.

Tasks:

- add CI workflow for `pnpm install`, `pnpm db:generate`, `pnpm build`
- add Prisma migration discipline and production migration notes
- replace direct page-level Prisma assumptions with clearer loading/empty/error states
- add seed data for demo tenant and realistic trade workflows
- document webhook signing for every channel
- add tests for `canExecuteAction`
- add tests for tenant resolution

Exit checkpoint:

- build passes in CI
- production env checklist is complete
- demo auth disabled in production
- first tenant can log in and view dashboard

## Phase 1: Pilot Operating System

Goal: support 3-5 businesses inside one trade association.

Tasks:

- organization onboarding flow
- user invite and role assignment
- lead create/edit/detail views
- company/contact detail views
- conversation detail with message timeline
- task due dates and owner assignment
- quotation draft/detail/review views
- approval request queue with approve/reject/execute
- audit log filters by action, actor, risk, and date

Exit checkpoint:

- association operator can onboard pilot members
- sales user can process inbound leads
- admin can approve high-risk actions
- audit trail explains every important mutation

## Phase 2: AI Inbox

Goal: convert messy inbound trade messages into structured work.

Tasks:

- structured LLM output for intent detection
- confidence score and missing-field extraction
- Vietnamese and English evaluation fixtures
- duplicate message detection
- lead/company matching
- follow-up suggestion
- quotation draft suggestion
- safe fallback when LLM or provider fails

Exit checkpoint:

- p95 triage latency under 4 seconds
- no direct AI database writes
- high-risk steps become approval requests
- false-positive lead creation rate is measured

## Phase 3: Integrations

Goal: make TradeOS useful where trade teams already work.

Tasks:

- signed Zalo webhook production adapter
- signed WhatsApp webhook production adapter
- email inbound adapter
- manual inbox entry
- webhook replay protection
- provider health dashboard
- Cloudflare WAF/rate-limit plan for public webhook routes

Exit checkpoint:

- every inbound event has idempotency
- failed events can be inspected and retried
- public routes have documented abuse controls

## Phase 4: Trade Intelligence

Goal: turn operational data into revenue insight.

Tasks:

- weekly association report
- stale opportunity detector
- lead response speed dashboard
- quotation conversion dashboard
- partner matching history
- product demand summary
- country/industry trend summary

Exit checkpoint:

- association can see measurable member value weekly
- businesses can identify missed revenue
- matching demand is evidence-backed

## Phase 5: Marketplace Readiness

Goal: decide whether marketplace expansion is justified.

Do not start until Phase 4 data proves repeated buyer/seller matching demand.

Tasks:

- define public/private company profile boundary
- define opt-in data sharing model
- define partner introduction workflow
- define monetization trigger
- define dispute and trust process

Exit checkpoint:

- marketplace scope is backed by usage data
- privacy and consent model is documented
- introduction workflow is approval-gated

## Rollback Plan

Feature rollback should prefer disabling behavior through:

- environment flags,
- role/policy gates,
- webhook provider disablement,
- Vercel deployment rollback,
- and database migration rollback only when data-safe.

Never rollback by deleting tenant data.

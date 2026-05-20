# TradeOS Core

AI Operating System for International Trade.

TradeOS Core is a production-oriented monorepo seed for international trade associations, export/import businesses, distributors, logistics partners, service networks, and AI-native trade operations.

## North Star

Turn trade relationships into structured data, trusted workflows, AI-assisted execution, and measurable revenue.

## Core Rule

Manual workflows are primary. AI automation only calls registered actions through a policy engine. AI must never directly mutate the database.

```txt
Manual UI -> Registered Action -> Policy Check -> Audit Log -> Database Mutation -> Optional AI Assist
```

## MVP Wedge

Do not start as a marketplace. Start with:

1. AI Inbox
2. AI CRM
3. AI Follow-up
4. AI Quotation Draft
5. Admin Dashboard
6. Trade Association Notifications

## Stack

- Turborepo
- TypeScript
- Next.js App Router
- Prisma
- Supabase Postgres
- pgvector-ready schema
- Redis queue-ready worker
- OpenAI/OpenRouter-compatible AI layer
- Vercel + Cloudflare-ready deployment

## Structure

```txt
apps/
  web/       Tenant dashboard
  admin/     Superadmin dashboard
  worker/    Background jobs
packages/
  database/  Prisma schema and client
  auth/      Tenant/session helpers
  ai-core/   AI orchestrator and tools
  crm-core/  CRM actions and domain types
  trade-core/ Trade actions and domain types
  inbox-core/ Conversation and message actions
  notification-core/ Admin/app notifications
  analytics-core/ Funnel and revenue metrics
  policy-core/ Action registry, policy, audit types
docs/
  ARCHITECTURE.md
  AGENTS.md
  DATABASE.md
  ROADMAP.md
  SECURITY.md
```

## First Build Target

Pilot with 3-5 businesses inside an international trade association. Measure lead response speed, follow-up completion, quotation volume, deal conversion, and revenue potential.

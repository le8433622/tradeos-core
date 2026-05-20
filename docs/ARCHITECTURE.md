# TradeOS Core Architecture

## Principle

TradeOS is not a static service app. It is a business operating layer for trade workflows.

The system keeps manual flows as the source of truth and lets AI operate only by calling registered actions.

## Runtime Flow

```txt
Inbound message
  -> AI Inbox
  -> Intent detection
  -> Agent plan
  -> Registered action
  -> Policy engine
  -> Audit log
  -> Database mutation
  -> Dashboard / notification
```

## MVP Modules

### 1. Tenant Layer

Each association member, exporter, importer, or distributor gets an `Organization` workspace.

### 2. CRM Layer

Lead, company, contact, deal, task, follow-up, and activity tracking.

### 3. Trade Layer

Products, quotations, buyer/seller profiles, partner suggestions, trade requests.

### 4. Inbox Layer

Conversation and message abstraction for web, Zalo, WhatsApp, email, Telegram, and manual input.

### 5. AI Core

Agent reads messages, plans action steps, then calls safe registered actions.

### 6. Policy Core

Controls who/what can execute each action.

High-risk examples:

- send quotation
- change contract
- delete data
- send bulk messages
- update payment state

These require human approval.

## First Production Slice

Build this order:

1. Organizations + users
2. Leads + companies
3. Conversations + messages
4. AI summary + create lead
5. Follow-up tasks
6. Draft quotation
7. Admin dashboard
8. Association notification module

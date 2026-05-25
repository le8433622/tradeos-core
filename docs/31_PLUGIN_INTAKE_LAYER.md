# Plugin Intake Layer — Architecture Spec

**Date**: 2026-05-26
**Status**: Spec-only — no source-code integration
**Issue**: #29

## 1. Strategic Premise

TradeOS wins by allowing AI to execute real economic cases through tools/plugins while preserving evidence, approval, billing, and outcome learning. Plugins are not the product core — they are action/data channels that feed the core chain:

```txt
pain/source signal → plugin → EvidenceItem → Case → Decision → Approval → Billing → Outcome learning
```

Every plugin must produce **evidence** or **case state**, not just raw data.

## 2. Plugin Interface

### 2.1 Plugin Registration

A plugin is registered by calling a function, following the existing `registerAction`/`registerProcessor` pattern:

```typescript
type PluginDefinition = {
  name: string; // unique plugin ID, e.g. "zalo-inbox"
  displayName: string; // human-readable, e.g. "Zalo Inbox"
  category: PluginCategory; // SOURCE | PARSER | EVIDENCE | PAYMENT | SIGNAL
  riskLevel: RiskLevel; // LOW | MEDIUM | HIGH
  inputs: PluginInputSchema[]; // what the plugin needs
  outputs: PluginOutputType; // what it produces
  handler: PluginHandler; // the execution function
};

function registerPlugin<Input, Output>(def: PluginDefinition): void;
```

### 2.2 Plugin Handler Signature

```typescript
type PluginContext = {
  organizationId: string;
  userId?: string;
  session: SessionContext;
  evidence: EvidenceAttachment; // function to attach evidence
  state: CaseStateAccess; // read/write case state
};

type PluginHandler<Input, Output> = (
  input: Input,
  context: PluginContext,
) => Promise<PluginResult<Output>>;

type PluginResult<Output> = {
  success: boolean;
  data?: Output;
  evidenceIds?: string[]; // evidence items created
  stateChanges?: Partial<CaseState>;
  error?: string;
};
```

### 2.3 Pipeline Adapter Pattern

For signal-type plugins (inbound messages, webhooks, social feeds), reuse the existing `WebhookPipelineInput` adapter pattern:

```typescript
type PluginPipelineInput = {
  pluginName: string;
  channel: ChannelType;
  extractPayload: (raw: unknown) => ProcessedPayload;
  tenantResolver: () => Promise<PluginTenant>;
  buildEvidence: (payload: ProcessedPayload) => EvidenceInput;
};
```

### 2.4 Async Processing Bridge

For heavy plugins (quote parsing, PDF extraction, supplier discovery), bridge to the existing job queue:

```typescript
type JobPluginProcessor = {
  pluginName: string;
  jobType: string; // new JobType per plugin
  processor: (job: ClaimedJob) => Promise<void>;
};

// Uses existing registerProcessor pattern from job-core
registerProcessor("PLUGIN_QUOTE_PARSE", handler);
```

## 3. Source-of-Truth Rules

Every plugin must follow these rules. Violations are design errors, not feature requests.

### Rule 1: Plugin is not the source of truth

The database (EvidenceItem, SourcingRun, EconomicCase, etc.) is the source of truth. Plugins cache, transform, and forward — they do not own state.

```txt
Plugin output → validated → persisted as EvidenceItem/CaseState
Plugin failure → state unaffected, error recorded
Plugin replay → idempotent via eventKey dedup (existing WebhookEvent pattern)
```

### Rule 2: Plugin produces evidence, not just data

Every plugin execution that changes case state must also create at least one `EvidenceItem`. The evidence must be verifiable (content hash, source URL, file URL, or audit trail).

```txt
Plugin run → EvidenceItem created → Case proceeds
Plugin run (no evidence) → warning logged, case not advanced
```

### Rule 3: Plugin is tenant-isolated

Every plugin operation is scoped by `organizationId`. Cross-tenant plugin access is blocked at the handler level (same as `validateRecordBelongsToOrg` pattern).

### Rule 4: Plugin is rate-limited

Inbound plugins (social signals, webhooks) use the existing rate limiter: 60 requests per 60 seconds per organization per channel. Outbound plugins (queries, searches) must implement their own rate limiting respecting the target platform's terms.

### Rule 5: Plugin is auditable

Every plugin invocation that changes state must write an audit log with:

- `pluginName` (which plugin)
- `action` (what it did)
- `input` (redacted for PII)
- `result` (success/failure summary)
- `evidenceIds` (evidence items created)

## 4. Evidence Creation Rules

### 4.1 Automatic Evidence

When a plugin creates or updates case state, it must also create evidence:

```typescript
const evidence = await context.evidence.attach({
  relatedType: "SOURCING_RUN",
  relatedId: sourcingRunId,
  evidenceType: pluginToEvidenceType(pluginName),
  title: `${plugin.displayName} — ${actionDescription}`,
  content: JSON.stringify(pluginOutput), // or hash reference
  hash: computeHash(pluginOutput),
  metadata: {
    pluginName: plugin.name,
    pluginVersion: plugin.version,
    inputHash: computeHash(input),
  },
});
```

### 4.2 Evidence Type Mapping

| Plugin Category      | Default EvidenceType                     | Overridable |
| -------------------- | ---------------------------------------- | ----------- |
| Social pain signal   | SYSTEM_LOG or new SOCIAL_PAIN_SIGNAL     | No          |
| Supplier source      | QUOTE_SCREENSHOT or new SUPPLIER_PROFILE | Yes         |
| Quote/invoice parser | QUOTE_FILE or INVOICE                    | Yes         |
| Evidence capture     | User-selected from existing enums        | N/A         |
| Payment/checkpoint   | PAYMENT_PROOF                            | No          |

### 4.3 Content Integrity

- All evidence payloads must include a `hash` field (SHA-256 of content)
- File-based evidence uses the existing `fileUrl` pattern
- External references use the existing `externalUrl` pattern
- The existing `EvidenceItem.hash` field must be populated whenever possible

## 5. Permission / Risk Levels

| Plugin Category                     | Default Risk | AI-auto?     | Human Approval     | Notes                         |
| ----------------------------------- | ------------ | ------------ | ------------------ | ----------------------------- |
| Social pain signal                  | LOW          | Yes          | No                 | Read-only signal ingestion    |
| Supplier source (search)            | MEDIUM       | Yes, flagged | No execution       | No commitment made            |
| Quote/invoice parser                | LOW          | Yes          | No                 | Data extraction only          |
| Quote/invoice capture (user upload) | LOW          | Yes          | No                 | Direct user action            |
| Evidence capture                    | LOW          | Yes          | No                 | Record-keeping                |
| Supplier discovery (automated)      | MEDIUM       | Yes, flagged | Flagged for review | May contact external services |
| Payment/checkpoint record           | HIGH         | No           | Yes (OWNER)        | Money movement                |
| Negotiation support                 | MEDIUM       | No           | Yes                | Relationship impact           |
| Supplier contact (automated)        | HIGH         | No           | Yes (OWNER)        | Real business action          |

### Plugin-specific permission keys

New permission keys needed when plugins are implemented:

```txt
plugin.*                          — manage all plugins
plugin.{name}.view               — view plugin data
plugin.{name}.execute            — execute plugin actions
plugin.{name}.configure          — configure plugin settings
```

## 6. Plugin Categories

### 6.1 Social Pain Signal Plugin

**Purpose**: Detect buyer pain, provider failure, action gap, payment trigger from social/messaging channels.

**Existing foundation**:

- `WebhookIntegration` model with `ChannelType` enum
- `processWebhookRequest` pipeline with `tenantResolver`, `extractMessage`, `adapters`
- `inbox.ingestMessage` registered action
- Zalo, WhatsApp, Email channel routes exist

**Gap**: No "signal analysis" layer after ingestion. The pipeline receives messages but does not extract intents, pain signals, or trigger cases.

**Mapping**:

```txt
Inbound message → inbox.ingestMessage → Conversation/Message created
→ Signal analysis plugin (new) → intent detected → EconomicCase created or updated
→ EvidenceItem created with source message link
```

**First implementation**: Extend existing Zalo/WhatsApp/Email inbox routes with an optional signal analyzer adapter.

### 6.2 Supplier Source Plugin

**Purpose**: Create `SupplierCandidate` and evidence from external supplier directories.

**Existing foundation**:

- `sourcing.addSupplierCandidate` registered action
- `SupplierCandidate` model with `source`, `platform`, `reliabilityScore`, `riskFlags`
- `sourcing.run` concept with status lifecycle

**Gap**: No automated supplier discovery. All candidates are added manually.

**Mapping**:

```txt
User query → SupplierSourcePlugin.search(query) → Candidate[] with evidence links
→ sourcing.addSupplierCandidate for each (with AI flag)
→ EvidenceItem created per candidate (source URL, reliability score, risk flags)
```

**First implementation**: Manual entry via existing `sourcing.addSupplierCandidate`. Automation deferred.

### 6.3 Quote/Invoice Parser Plugin

**Purpose**: Extract structured quote data from PDF, screenshot, email, Excel, product link.

**Existing foundation**:

- `sourcing.addSupplierQuote` registered action
- `SupplierQuote` model with `productDescription`, `quantity`, `unitPrice`, `totalAmount`, `currency`, `moq`, `leadTime`, `shippingTerm`, `paymentTerm`, `warranty`, `rawData`

**Gap**: No automated extraction. All quotes must be entered manually via the action.

**Mapping**:

```txt
Quote file/email/screenshot → QuoteParserPlugin.parse(file) → StructuredQuote
→ sourcing.addSupplierQuote (via AI with human review)
→ EvidenceItem created (raw source + extracted data + confidence score)
```

**First implementation**: Manual entry via structured form. PDF/image parsing deferred.

### 6.4 Evidence Capture Plugin

**Purpose**: Capture screenshots, file uploads, chat logs, call notes as auditable `EvidenceItem` records.

**Existing foundation**:

- `EvidenceItem` model with polymorphic attachment, content hash, file/URL storage
- 11 existing `EvidenceType` enum values

**Mapping**:

```txt
User upload/file capture → EvidenceCapturePlugin.capture(input) → EvidenceItem
→ Linked to SourcingRun or EconomicCase via relatedType + relatedId
```

**First implementation**: Works today through existing API routes and `executeAction` patterns.

### 6.5 Payment/Checkpoint Plugin

**Purpose**: Record proof of payment and idempotent settlement events.

**Existing foundation**:

- `checkpoint.markAsBilled`, `checkpoint.recordPayment` registered actions
- `WorkCheckpoint` lifecycle (PENDING → BILLED)
- `Payment` model referenced by `checkpoint.recordPayment`
- `encryptWebhookSecret` / `decryptWebhookSecret` for credential storage

**Gap**: No external payment gateway integration (VietQR, PayOS, Casso, Stripe). Current flow requires manual owner action.

**Mapping**:

```txt
Payment webhook → PaymentPlugin.handleWebhook(payload) → checkpoint.recordPayment
→ EvidenceItem created (payment proof)
```

**First implementation**: Extend `checkpoint.recordPayment` with webhook-compatible adapter.

## 7. Architecture Mapping

| Plugin concept      | Existing TradeOS mechanism                          | Gap                                     |
| ------------------- | --------------------------------------------------- | --------------------------------------- |
| Plugin registration | `registerAction()` / `registerProcessor()`          | No generic `registerPlugin()`           |
| Plugin pipeline     | `processWebhookRequest()` with adapters             | Signal-only; no generic plugin pipeline |
| Plugin storage      | `WebhookIntegration` model                          | Narrow (webhook-focused)                |
| Evidence output     | `EvidenceItem` (polymorphic)                        | Mature — no gap                         |
| Case state          | `SourcingRun` status lifecycle                      | Mature — no gap                         |
| Job queue           | `Job` + `registerProcessor()`                       | Mature — reusable pattern               |
| Env config          | `encryptWebhookSecret()` / `decryptWebhookSecret()` | Mature — reusable                       |
| API routes          | `apps/web/app/api/webhooks/*/route.ts`              | Per-channel, not generic                |
| Plugin permissions  | `integration.manage` permission                     | Narrow; needs `plugin.*` keys           |
| Plan gating         | `checkEntitlement("integrations")`                  | Mature — extensible                     |

## 8. Plugin Lifecycle

### Registration

```txt
Plugin package created → imports policy-core → calls registerPlugin()
→ Plugin registered in global PluginRegistry
→ If job type: calls registerProcessor(jobType, processor)
→ If webhook: creates route that instantiates pipeline with plugin adapters
```

### Execution (synchronous)

```txt
Caller (user/AI/event) → executePlugin(pluginName, input, context)
→ Policy check (role + permission + MFA)
→ Plugin handler runs
→ Evidence created (if state changed)
→ Audit log written
→ Result returned
```

### Execution (async via job queue)

```txt
Caller → executePlugin(pluginName, input, context)
→ Policy check → enqueueJob(jobType, payload)
→ Worker picks up job → Plugin handler runs
→ Evidence created → Job completed
→ Webhook or polling notifies caller
```

## 9. Human Approval Boundaries

| Plugin operation                        | Risk     | AI auto?     | Approval          | Notes               |
| --------------------------------------- | -------- | ------------ | ----------------- | ------------------- |
| Read/signal detection                   | LOW      | Yes          | No                | Passive             |
| Data extraction from user-provided file | LOW      | Yes          | No                | User-initiated      |
| Supplier directory search               | MEDIUM   | Yes, flagged | No                | Read-only           |
| Quote comparison                        | LOW      | Yes          | No                | Computational       |
| **Automated supplier contact**          | **HIGH** | **No**       | **Yes (OWNER)**   | External commitment |
| **Payment settlement**                  | **HIGH** | **No**       | **Yes (OWNER)**   | Money movement      |
| **Negotiation action**                  | **HIGH** | **No**       | **Yes (OWNER)**   | Relationship impact |
| Plugin configuration change             | MEDIUM   | No           | Yes (ADMIN/OWNER) | Security boundary   |
| New plugin activation                   | MEDIUM   | No           | Yes (ADMIN/OWNER) | Entitlement check   |

## 10. First 3 Plugins to Implement

### Plugin #1: Quote/Invoice Parser (Priority: HIGH)

**Why first**: Directly supports Supplier Switch Intelligence (issue #28). Every sourcing case needs quote ingestion.

**Implementation scope**:

1. Extend `sourcing.addSupplierQuote` with optional `rawData` and `sourceEvidenceId`
2. Add structured form with field-level validation
3. Create `PLUGIN_QUOTE_PARSE` job type for async processing
4. Register `registerProcessor("PLUGIN_QUOTE_PARSE", quoteParseProcessor)`

**Evidence impact**: Creates `QUOTE_FILE` or `INVOICE` `EvidenceItem` with hash + fileUrl

### Plugin #2: Social Pain Signal / Inbox Analyzer (Priority: MEDIUM)

**Why second**: Leverages existing Zalo/WhatsApp/Email inbox routes with minimal new code.

**Implementation scope**:

1. Add optional `signalAnalyzer` adapter to `WebhookPipelineInput`
2. Create signal detection function (intent classification, pain keywords, action triggers)
3. When signal detected: create or link to `SourcingRun` / `EconomicCase` with evidence
4. Register as a plugin adapter, not a standalone plugin

**Evidence impact**: Creates `SYSTEM_LOG` `EvidenceItem` with source message link

### Plugin #3: Supplier Source — Alibaba/Aliexpress Discovery (Priority: LOW)

**Why third**: High value but complex — requires web scraping or API access.

**Implementation scope**:

1. Create `sourcing.discoverSuppliers` registered action (AI with human review)
2. Accept query parameters (product, country, quantity)
3. Return structured `SupplierCandidate[]` with `source: "Alibaba"`, `reliabilityScore`
4. Each candidate linked to evidence (platform URL, rating, risk flags)

**Evidence impact**: Creates `QUOTE_SCREENSHOT` or new `SUPPLIER_PROFILE` `EvidenceItem`

## 11. Non-Goals

1. **No social media automation** — TradeOS does not post, reply, or engage on social platforms. It only reads signals.
2. **No marketplace** — Plugins do not match buyers with sellers. They help buyers evaluate.
3. **No blind scraping** — Every plugin action is scoped to a user-initiated case or configured channel.
4. **No generic ETL** — Plugins produce evidence and case state, not raw data pipelines.
5. **No plugin store / marketplace** — Plugins are configured, not installed from a public registry.
6. **No plugin SDK v1** — The first iteration uses internal interfaces, not a public SDK.
7. **No production integrations before proof gates clear** — Spec-only until E2E and authenticated smoke pass.

## 12. Implementation Checklist

Before any plugin code is written, these must be complete:

| Prerequisite                                  | Issue/Status       |
| --------------------------------------------- | ------------------ |
| Supplier Switch spec complete                 | ✅ #28 closed      |
| Production smoke passes                       | ✅ #26 closed      |
| E2E harness exists                            | ✅ #27 closed      |
| `PluginDefinition` type designed              | This spec          |
| `registerPlugin()` function designed          | This spec          |
| `plugin.*` permission keys added              | Pre-implementation |
| New `EvidenceType` enum values added          | Pre-implementation |
| Plugin count added to `plan-core` entitlement | Pre-implementation |

## 13. Risk Assessment

| Risk                                  | Likelihood | Impact | Mitigation                                                         |
| ------------------------------------- | ---------- | ------ | ------------------------------------------------------------------ |
| Plugin system over-engineered         | Medium     | Medium | Start with concrete plugins #1-#3 before abstracting               |
| Social signal noise too high          | High       | Medium | Threshold-based signal filtering; user review before case creation |
| Quote parser accuracy low             | Medium     | High   | Manual override always available; confidence scores displayed      |
| External source (Alibaba) API changes | Medium     | Medium | Adapter pattern isolates platform-specific code                    |
| Plugin permission complexity          | Low        | Medium | Start with coarse `plugin.manage`; refine later                    |
| No plugin SDK delays adoption         | High       | Low    | First 3 plugins are in-repo; SDK is Phase B                        |

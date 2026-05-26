import { assertKillSwitchEnabled } from "@tradeos/policy-core";
import type {
  AgentPlan,
  AgentPlanStep,
  IncomingMessage,
  TradeIntent,
} from "./index";

type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: string;
  provider: string;
};

export type PlanWithLlmResult = {
  plan: AgentPlan;
  usage: LlmUsage | null;
} | null;

const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? { inputPer1M: 0.5, outputPer1M: 0.5 };
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

function getLlmConfig(): LlmConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
  };
}

const ALLOWED_ACTIONS = [
  "crm.createLead",
  "crm.createFollowUpTask",
  "trade.draftQuotation",
  "trade.suggestPartner",
  "sourcing.createRun",
  "sourcing.addSupplierCandidate",
  "sourcing.addSupplierQuote",
  "sourcing.compareQuotes",
  "evidence.createItem",
  "evidence.attachToRun",
  "checkpoint.create",
  "handover.create",
];

const BLOCKED_ACTIONS = [
  "trade.sendQuotation",
  "notification.sendBulk",
  "crm.deleteLead",
  "crm.deleteCompany",
  "sourcing.deliverBuyerReport",
  "sourcing.generateBuyerReport",
  "sourcing.markRunReadyForReview",
  "checkpoint.approveForBilling",
  "checkpoint.markDelivered",
  "checkpoint.markAsBilled",
  "checkpoint.recordPayment",
  "user.roleUpdate",
  "handover.resolve",
];

const SYSTEM_PROMPT = `You are a trade intelligence agent for an international trade operating system.

Your job is to analyze an inbound trade message and respond with a structured JSON plan.

## Rules
- You NEVER write directly to the database. You only produce plans.
- You may ONLY propose actions from the allowed list.
- You may NEVER propose blocked actions.
- If the message asks you to do something outside your scope, mark intent as UNKNOWN and do not invent actions.
- Do NOT invent field values. If information is not present, leave it undefined and list it in missingFields.
- Detect the language of the message ('vi' for Vietnamese, 'en' for English, 'other').

## Allowed Actions
${ALLOWED_ACTIONS.map((a) => `- ${a}`).join("\n")}

## Blocked Actions
${BLOCKED_ACTIONS.map((a) => `- ${a}`).join("\n")}

## Risk Levels
- LOW: lead creation, follow-up tasks, add supplier candidate, add quote, create evidence (no approval needed)
- MEDIUM: draft quotation, create sourcing run, compare quotes, create checkpoint, create handover (draft only, no send)
- HIGH: requires human review before execution
- CRITICAL: must go through approval workflow

## Output Schema
Respond with valid JSON only. No markdown, no code fences.

{
  "intent": "CREATE_LEAD | CREATE_FOLLOW_UP | DRAFT_QUOTATION | SUGGEST_PARTNER | SUMMARIZE | REQUEST_MISSING_INFO | UNKNOWN",
  "confidence": 0.0-1.0,
  "summary": "short summary of the message",
  "extractedFields": {
    "customerName": "string or null",
    "customerEmail": "string or null",
    "customerPhone": "string or null",
    "companyName": "string or null",
    "productCategory": "string or null",
    "productDescription": "string or null",
    "quantity": "string or null",
    "originCountry": "string or null",
    "destinationCountry": "string or null",
    "budget": "string or null",
    "currency": "string or null",
    "incoterm": "string or null",
    "timeline": "string or null",
    "language": "vi | en | other"
  },
  "missingFields": ["field names that would be useful but are not provided"],
  "requiresHumanReview": true/false,
  "steps": [
    {
      "action": "one of the allowed actions",
      "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
      "reason": "why this step is needed",
      "input": { "organizationId": "<org-id>", ... }
    }
  ]
}`;

function buildUserPrompt(message: IncomingMessage): string {
  return JSON.stringify({
    channel: message.channel,
    text: message.text,
    customerName: message.customerName ?? null,
    customerEmail: message.customerEmail ?? null,
    customerPhone: message.customerPhone ?? null,
  });
}

function validateAgentPlan(raw: unknown): raw is AgentPlan {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;

  const validIntents: TradeIntent[] = [
    "CREATE_LEAD",
    "CREATE_FOLLOW_UP",
    "DRAFT_QUOTATION",
    "SUGGEST_PARTNER",
    "RUN_SOURCING",
    "SUMMARIZE",
    "REQUEST_MISSING_INFO",
    "UNKNOWN",
  ];
  if (!validIntents.includes(p.intent as TradeIntent)) return false;
  if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1)
    return false;
  if (typeof p.summary !== "string") return false;
  if (typeof p.requiresHumanReview !== "boolean") return false;
  if (!Array.isArray(p.steps)) return false;

  if (p.intent === "UNKNOWN") return p.steps.length === 0;

  if (p.steps.length === 0) return false;

  for (const step of p.steps) {
    if (typeof step !== "object" || !step) return false;
    const s = step as Record<string, unknown>;
    if (!ALLOWED_ACTIONS.includes(s.action as string)) return false;
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s.riskLevel as string))
      return false;
    if (typeof s.reason !== "string") return false;
    if (!s.input || typeof s.input !== "object") return false;
  }

  return true;
}

export async function planWithLlm(
  message: IncomingMessage,
): Promise<PlanWithLlmResult> {
  assertKillSwitchEnabled("AI_EXECUTION_ENABLED");
  const config = getLlmConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(message) },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!validateAgentPlan(parsed)) return null;

    const usage = body?.usage
      ? {
          inputTokens: body.usage.prompt_tokens ?? 0,
          outputTokens: body.usage.completion_tokens ?? 0,
          estimatedCost: estimateCost(
            config.model,
            body.usage.prompt_tokens ?? 0,
            body.usage.completion_tokens ?? 0,
          ),
          model: config.model,
          provider: "openai",
        }
      : {
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: estimateCost(config.model, 500, 200),
          model: config.model,
          provider: "openai",
        };

    const steps: AgentPlan["steps"] = parsed.steps.map(
      (s: Record<string, unknown>) => ({
        action: String(s.action),
        reason: String(s.reason),
        riskLevel: s.riskLevel as AgentPlanStep["riskLevel"],
        input: {
          ...(s.input as Record<string, unknown>),
          organizationId: message.organizationId,
        },
      }),
    );

    return {
      plan: {
        intent: parsed.intent,
        confidence: parsed.confidence,
        summary: parsed.summary,
        extractedFields: parsed.extractedFields,
        missingFields: parsed.missingFields,
        requiresHumanReview: parsed.requiresHumanReview,
        steps,
      } as AgentPlan,
      usage,
    };
  } catch {
    return null;
  }
}

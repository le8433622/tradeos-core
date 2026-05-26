import {
  assertKillSwitchEnabled,
  executeAction,
  getAction,
  type ActionContext,
} from "@tradeos/policy-core";
import { createApprovalRequest } from "@tradeos/approval-core";
import "@tradeos/crm-core";
import "@tradeos/trade-core";
import { planWithLlm, type LlmUsage } from "./llm";

const MAX_SUMMARY_LENGTH = 220;
const CONFIDENCE_HIGH = 0.6;
const CONFIDENCE_MEDIUM = 0.5;
const CONFIDENCE_LOW = 0.3;

export type TradeIntent =
  | "CREATE_LEAD"
  | "CREATE_FOLLOW_UP"
  | "DRAFT_QUOTATION"
  | "SUGGEST_PARTNER"
  | "RUN_SOURCING"
  | "SUMMARIZE"
  | "REQUEST_MISSING_INFO"
  | "UNKNOWN";

export type IncomingMessage = {
  organizationId: string;
  channel: "web" | "zalo" | "whatsapp" | "email" | "manual";
  text: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

export type ExtractedFields = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  productCategory?: string;
  productDescription?: string;
  quantity?: string;
  originCountry?: string;
  destinationCountry?: string;
  budget?: string;
  currency?: string;
  incoterm?: string;
  timeline?: string;
  language?: "vi" | "en" | "other";
};

export type AgentPlanStep = {
  action: string;
  input: Record<string, unknown>;
  reason: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type AgentPlan = {
  intent: TradeIntent;
  confidence: number;
  summary: string;
  extractedFields: ExtractedFields;
  missingFields: string[];
  steps: AgentPlanStep[];
  requiresHumanReview: boolean;
};

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|the above|instructions|prompt|rules)/i,
  /disregard\s+(previous|all|the above|instructions|prompt|rules)/i,
  /forget\s+(previous|all|the above|instructions|prompt|rules)/i,
  /you\s+are\s+(now\s+)?(a\s+)?system\s+admin/i,
  /you\s+are\s+(now\s+)?(a\s+)?helpful\s+assistant/i,
  /act\s+as\s+(if\s+)?you\s+(are|were)/i,
  /new\s+(instructions|rule(s)?|prompt)/i,
  /over(ride|write)\s+(previous|all|the above)/i,
  /do\s+(not\s+)?(follow|obey)\s+(the\s+)?(rules|instructions|guidelines)/i,
  /bỏ\s+qua\s+(tất\s+cả\s+)?(hướng\s+dẫn|chỉ\s+thị|lệnh|rules)/i,
  /không\s+(cần\s+)?tuân\s+theo\s+(hướng\s+dẫn|chỉ\s+thị|lệnh)/i,
  /không\s+nghe\s+(theo\s+)?(hướng\s+dẫn|chỉ\s+thị|lệnh)/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

const NON_TRADE_KEYWORDS = [
  "reset password",
  "forgot password",
  "login",
  "sign in",
  "sign up",
  "register",
  "technical support",
  "bug report",
  "báo lỗi",
  "kỹ thuật",
  "kích hoạt tài khoản",
];

function hasTradeContext(text: string): boolean {
  const lower = text.toLowerCase();
  return !NON_TRADE_KEYWORDS.some((k) => lower.includes(k));
}

const TRADE_KEYWORDS = [
  "cần mua",
  "cần bán",
  "tìm",
  "supplier",
  "exporter",
  "importer",
  "looking for",
  "want to",
  "need to",
  "nhập khẩu",
  "xuất khẩu",
  "mặt hàng",
  "sản phẩm",
  "interested",
  "buy",
  "sell",
  "trade",
  "export",
  "import",
  "sourcing",
  "procurement",
  "công ty tôi",
  "công ty chúng tôi",
  "công ty mình",
];

export function detectTradeIntent(message: IncomingMessage): TradeIntent {
  const text = message.text.toLowerCase();
  if (detectPromptInjection(message.text)) return "UNKNOWN";
  if (
    text.includes("báo giá") ||
    text.includes("quote") ||
    text.includes("quotation")
  )
    return "DRAFT_QUOTATION";
  if (text.includes("nhắc") || text.includes("follow") || text.includes("hẹn"))
    return "CREATE_FOLLOW_UP";
  if (
    text.includes("đối tác") ||
    text.includes("partner") ||
    text.includes("buyer") ||
    text.includes("seller")
  )
    return "SUGGEST_PARTNER";
  if (
    text.includes("sourcing") ||
    text.includes("procurement") ||
    text.includes("tìm nguồn") ||
    text.includes("tìm nhà cung cấp") ||
    text.includes("supplier") ||
    text.includes("nhà cung cấp") ||
    text.includes("so sánh giá") ||
    text.includes("compare supplier")
  )
    return "RUN_SOURCING";

  const hasContact = Boolean(message.customerEmail || message.customerPhone);
  const hasKeyword = TRADE_KEYWORDS.some((kw) => text.includes(kw));
  if (hasKeyword || (hasContact && hasTradeContext(text))) {
    return "CREATE_LEAD";
  }
  return "UNKNOWN";
}

export function extractFields(
  text: string,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string,
): ExtractedFields {
  const lower = text.toLowerCase();
  const fields: ExtractedFields = {
    customerName,
    customerEmail,
    customerPhone,
  };

  const quantityMatch = lower.match(
    /(\d+[.,]?\d*)\s*(tấn|t?n|mt|kg|pcs|pieces|tons|containers|container|mét|m)/i,
  );
  if (quantityMatch)
    fields.quantity = quantityMatch[1] + " " + quantityMatch[2];

  const incoterms = ["CIF", "FOB", "EXW", "DDP", "DAP", "CFR", "CIP", "FCA"];
  for (const inc of incoterms) {
    if (lower.includes(inc.toLowerCase())) {
      fields.incoterm = inc;
      break;
    }
  }

  const destCountryMatch = lower.match(
    /(?:sang|to|delivery to|destination|về|cho|tới|dến)\s+([a-zàáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữíìịỉĩýỳỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữíìịỉĩýỳỵỷỹđ]+){0,3})/i,
  );
  if (destCountryMatch) fields.destinationCountry = destCountryMatch[1];

  const originMatch = lower.match(
    /(?:from|from|ở|từ|tại|tại)\s+([a-zàáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữíìịỉĩýỳỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữíìịỉĩýỳỵỷỹđ]+){0,2})/i,
  );
  if (originMatch) fields.originCountry = originMatch[1];

  const budgetMatch = lower.match(
    /(\d+[.,]?\d*)\s*(usd|vnd|eur|đô|đồng|dollar|euro)/i,
  );
  if (budgetMatch) {
    fields.budget = budgetMatch[1];
    fields.currency = budgetMatch[2].toUpperCase();
  }

  const currencyMap: Record<string, string> = {
    usd: "USD",
    vnd: "VND",
    eur: "EUR",
    đô: "USD",
    đồng: "VND",
    dollar: "USD",
    euro: "EUR",
  };
  const baseCurrency = fields.currency?.toLowerCase();
  if (baseCurrency && currencyMap[baseCurrency]) {
    fields.currency = currencyMap[baseCurrency];
  }

  return fields;
}

export function planTradeAgent(message: IncomingMessage): AgentPlan {
  const intent = detectTradeIntent(message);
  const baseSummary = `Incoming ${message.channel} message: ${message.text.slice(0, MAX_SUMMARY_LENGTH)}`;
  const extractedFields = extractFields(
    message.text,
    message.customerName,
    message.customerEmail,
    message.customerPhone,
  );

  if (intent === "DRAFT_QUOTATION") {
    return {
      intent,
      confidence: CONFIDENCE_HIGH,
      summary: baseSummary,
      requiresHumanReview: true,
      extractedFields,
      missingFields: [
        "productCategory",
        "quantity",
        "originCountry",
        "destinationCountry",
      ],
      steps: [
        {
          action: "trade.draftQuotation",
          riskLevel: "MEDIUM",
          reason:
            "Customer appears to request a quotation. Draft only; human review is required before sending.",
          input: {
            organizationId: message.organizationId,
            title: `Draft quotation from ${message.channel}`,
            requirements: message.text,
          },
        },
      ],
    };
  }

  if (intent === "CREATE_FOLLOW_UP") {
    return {
      intent,
      confidence: CONFIDENCE_HIGH,
      summary: baseSummary,
      requiresHumanReview: false,
      extractedFields,
      missingFields: [],
      steps: [
        {
          action: "crm.createFollowUpTask",
          riskLevel: "LOW",
          reason: "Message contains a follow-up or appointment signal.",
          input: {
            organizationId: message.organizationId,
            title: "Follow up trade lead",
            description: message.text,
          },
        },
      ],
    };
  }

  if (intent === "SUGGEST_PARTNER") {
    return {
      intent,
      confidence: CONFIDENCE_HIGH,
      summary: baseSummary,
      requiresHumanReview: false,
      extractedFields,
      missingFields: [],
      steps: [
        {
          action: "trade.suggestPartner",
          riskLevel: "LOW",
          reason:
            "Message asks for a partner, buyer, seller, or channel match.",
          input: {
            organizationId: message.organizationId,
            need: message.text,
          },
        },
      ],
    };
  }

  if (intent === "RUN_SOURCING") {
    return {
      intent,
      confidence: CONFIDENCE_HIGH,
      summary: baseSummary,
      requiresHumanReview: false,
      extractedFields,
      missingFields: ["targetCountry", "productCategory"],
      steps: [
        {
          action: "sourcing.createRun",
          riskLevel: "MEDIUM",
          reason:
            "Message requests supplier sourcing or procurement assistance. Creating sourcing run for AI-driven supplier discovery.",
          input: {
            organizationId: message.organizationId,
            title: `Sourcing run from ${message.channel}`,
            requirement: message.text,
            targetCountry: extractedFields.originCountry,
            sourceCountry: extractedFields.destinationCountry,
            productCategory: extractedFields.productCategory,
            quantity: extractedFields.quantity,
            budget: extractedFields.budget,
            currency: extractedFields.currency,
          },
        },
      ],
    };
  }

  if (intent === "UNKNOWN") {
    return {
      intent,
      confidence: CONFIDENCE_LOW,
      summary: baseSummary,
      requiresHumanReview: true,
      extractedFields,
      missingFields: [],
      steps: [],
    };
  }

  return {
    intent,
    confidence: CONFIDENCE_MEDIUM,
    summary: baseSummary,
    requiresHumanReview: false,
    extractedFields,
    missingFields: ["customerName", "productCategory"],
    steps: [
      {
        action: "crm.createLead",
        riskLevel: "LOW",
        reason:
          "Default action: capture inbound trade message as a lead for human follow-up.",
        input: {
          organizationId: message.organizationId,
          source: message.channel,
          name: message.customerName,
          phone: message.customerPhone,
          email: message.customerEmail,
          need: message.text,
          aiSummary: baseSummary,
          nextAction: "Review and qualify lead",
        },
      },
    ],
  };
}

async function getAiBudget(
  organizationId: string,
  context: ActionContext,
): Promise<{ budget: number; spent: number }> {
  return executeAction<
    { organizationId: string },
    { budget: number; spent: number }
  >("budget.getStatus", { organizationId }, context);
}

async function trackAiUsage(
  organizationId: string,
  feature: string,
  usage: LlmUsage | null,
  context: ActionContext,
): Promise<void> {
  if (!usage) return;
  await executeAction(
    "ai.trackUsage",
    {
      organizationId,
      feature,
      provider: usage.provider,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
    },
    context,
  );
}

export async function runTradeAgent(
  message: IncomingMessage,
  context: ActionContext,
) {
  assertKillSwitchEnabled("AI_EXECUTION_ENABLED");
  const injectionDetected = detectPromptInjection(message.text);
  const baseSummary = `Incoming ${message.channel} message: ${message.text.slice(0, MAX_SUMMARY_LENGTH)}`;

  if (injectionDetected) {
    return {
      plan: {
        intent: "UNKNOWN" as TradeIntent,
        confidence: 0,
        summary: baseSummary,
        requiresHumanReview: true,
        extractedFields: {},
        missingFields: [],
        steps: [],
      },
      results: [],
      budgetLimited: false,
      monthlyBudget: 0,
      monthlySpend: 0,
      injectionDetected: true,
    };
  }

  const { budget, spent } = await getAiBudget(message.organizationId, context);
  const budgetExhausted = budget > 0 && spent >= budget;

  let llmPlan: Awaited<ReturnType<typeof planWithLlm>>;
  let budgetLimited = false;

  if (budgetExhausted) {
    llmPlan = null;
    budgetLimited = true;
  } else {
    llmPlan = await planWithLlm(message);
    if (llmPlan?.usage) {
      await trackAiUsage(
        message.organizationId,
        "runTradeAgent",
        llmPlan.usage,
        context,
      );
    }
  }

  const plan = llmPlan?.plan ?? planTradeAgent(message);
  const results: AgentStepResult[] = [];

  for (const step of plan.steps) {
    const actionDef = getAction(step.action);
    if (!actionDef) {
      results.push({
        step,
        status: "REJECTED",
        error: `Unknown action: ${step.action}`,
        llmRiskLevel: step.riskLevel,
      });
      continue;
    }

    const stepRequiresApproval =
      actionDef.requiresApprovalForAI ||
      actionDef.riskLevel === "HIGH" ||
      actionDef.riskLevel === "CRITICAL" ||
      step.riskLevel === "HIGH" ||
      step.riskLevel === "CRITICAL";

    if (stepRequiresApproval && !context.approved) {
      try {
        const approvalRequest = await createApprovalRequest({
          organizationId: message.organizationId,
          requestedById: context.actorUserId,
          actionName: step.action,
          input: step.input,
          reason: step.reason,
        });
        results.push({
          step,
          status: "PENDING_APPROVAL",
          approvalRequest,
          llmRiskLevel: step.riskLevel,
        });
      } catch (error) {
        results.push({
          step,
          status: "REJECTED",
          error:
            error instanceof Error ? error.message : "Approval request failed",
          llmRiskLevel: step.riskLevel,
        });
      }
    } else {
      try {
        const output = await executeAction(step.action, step.input, {
          ...context,
          organizationId: message.organizationId,
          source: "ai",
        });
        results.push({
          step,
          status: "EXECUTED",
          output,
          llmRiskLevel: step.riskLevel,
        });
      } catch (error) {
        results.push({
          step,
          status: "FAILED",
          error:
            error instanceof Error ? error.message : "Step execution failed",
          llmRiskLevel: step.riskLevel,
        });
      }
    }
  }

  return {
    plan,
    results,
    budgetLimited,
    monthlyBudget: budget,
    monthlySpend: spent,
    injectionDetected: false,
  };
}

export type AgentStepResult = {
  step: AgentPlanStep;
  status: "EXECUTED" | "PENDING_APPROVAL" | "REJECTED" | "FAILED";
  output?: unknown;
  error?: string;
  approvalRequest?: {
    id: string;
    status: string;
  };
  llmRiskLevel?: AgentPlanStep["riskLevel"];
};

export type TradeAgentResult = {
  plan: AgentPlan;
  results: AgentStepResult[];
  budgetLimited: boolean;
  monthlyBudget: number;
  monthlySpend: number;
  injectionDetected: boolean;
};

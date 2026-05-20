import { executeAction, type ActionContext } from '@tradeos/policy-core';
import '@tradeos/crm-core';
import '@tradeos/trade-core';

export type TradeIntent =
  | 'CREATE_LEAD'
  | 'CREATE_FOLLOW_UP'
  | 'DRAFT_QUOTATION'
  | 'SUGGEST_PARTNER'
  | 'SUMMARIZE'
  | 'UNKNOWN';

export type IncomingMessage = {
  organizationId: string;
  channel: 'web' | 'zalo' | 'whatsapp' | 'email' | 'manual';
  text: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

export type AgentPlanStep = {
  action: string;
  input: Record<string, unknown>;
  reason: string;
};

export type AgentPlan = {
  intent: TradeIntent;
  summary: string;
  steps: AgentPlanStep[];
  requiresHumanReview: boolean;
};

export function detectTradeIntent(message: IncomingMessage): TradeIntent {
  const text = message.text.toLowerCase();
  if (text.includes('báo giá') || text.includes('quote') || text.includes('quotation')) return 'DRAFT_QUOTATION';
  if (text.includes('nhắc') || text.includes('follow') || text.includes('hẹn')) return 'CREATE_FOLLOW_UP';
  if (text.includes('đối tác') || text.includes('partner') || text.includes('buyer') || text.includes('seller')) return 'SUGGEST_PARTNER';
  if (message.customerEmail || message.customerPhone || text.includes('cần mua') || text.includes('cần bán')) return 'CREATE_LEAD';
  return 'UNKNOWN';
}

export function planTradeAgent(message: IncomingMessage): AgentPlan {
  const intent = detectTradeIntent(message);
  const baseSummary = `Incoming ${message.channel} message: ${message.text.slice(0, 220)}`;

  if (intent === 'DRAFT_QUOTATION') {
    return {
      intent,
      summary: baseSummary,
      requiresHumanReview: true,
      steps: [
        {
          action: 'trade.draftQuotation',
          reason: 'Customer appears to request a quotation. Draft only; human review is required before sending.',
          input: {
            organizationId: message.organizationId,
            title: `Draft quotation from ${message.channel}`,
            requirements: message.text,
          },
        },
      ],
    };
  }

  if (intent === 'CREATE_FOLLOW_UP') {
    return {
      intent,
      summary: baseSummary,
      requiresHumanReview: false,
      steps: [
        {
          action: 'crm.createFollowUpTask',
          reason: 'Message contains a follow-up or appointment signal.',
          input: {
            organizationId: message.organizationId,
            title: 'Follow up trade lead',
            description: message.text,
          },
        },
      ],
    };
  }

  if (intent === 'SUGGEST_PARTNER') {
    return {
      intent,
      summary: baseSummary,
      requiresHumanReview: false,
      steps: [
        {
          action: 'trade.suggestPartner',
          reason: 'Message asks for a partner, buyer, seller, or channel match.',
          input: {
            organizationId: message.organizationId,
            need: message.text,
          },
        },
      ],
    };
  }

  return {
    intent: intent === 'UNKNOWN' ? 'CREATE_LEAD' : intent,
    summary: baseSummary,
    requiresHumanReview: false,
    steps: [
      {
        action: 'crm.createLead',
        reason: 'Default action: capture inbound trade message as a lead for human follow-up.',
        input: {
          organizationId: message.organizationId,
          source: message.channel,
          name: message.customerName,
          phone: message.customerPhone,
          email: message.customerEmail,
          need: message.text,
          aiSummary: baseSummary,
          nextAction: 'Review and qualify lead',
        },
      },
    ],
  };
}

export async function runTradeAgent(message: IncomingMessage, context: ActionContext) {
  const plan = planTradeAgent(message);
  const results = [];

  for (const step of plan.steps) {
    const result = await executeAction(step.action, step.input, {
      ...context,
      organizationId: message.organizationId,
      source: 'ai',
    });
    results.push({ step, result });
  }

  return { plan, results };
}

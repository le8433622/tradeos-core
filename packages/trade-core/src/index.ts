import { DEFAULT_ADMIN_ROLES, DEFAULT_LOW_RISK_ROLES, registerAction } from '@tradeos/policy-core';

export type DraftQuotationInput = {
  organizationId: string;
  leadId?: string;
  title: string;
  requirements: string;
  currency?: string;
  estimatedAmount?: number;
};

export type SuggestPartnerInput = {
  organizationId: string;
  need: string;
  country?: string;
  category?: string;
};

export const draftQuotationAction = registerAction<DraftQuotationInput, DraftQuotationInput & { status: 'DRAFT' }>({
  name: 'trade.draftQuotation',
  description: 'Create a draft quotation. AI may draft, but human must review before sending.',
  riskLevel: 'MEDIUM',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    return { ...input, status: 'DRAFT' };
  },
});

export const sendQuotationAction = registerAction<{ quotationId: string }, { quotationId: string; status: 'SENT' }>({
  name: 'trade.sendQuotation',
  description: 'Send a quotation to a customer. AI is not allowed to execute without approval.',
  riskLevel: 'HIGH',
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input) => {
    return { quotationId: input.quotationId, status: 'SENT' };
  },
});

export const suggestPartnerAction = registerAction<SuggestPartnerInput, { suggestions: unknown[] }>({
  name: 'trade.suggestPartner',
  description: 'Suggest buyer, seller, logistics, or service partners for a trade need.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async () => {
    return { suggestions: [] };
  },
});

export function registerTradeActions() {
  return [draftQuotationAction, sendQuotationAction, suggestPartnerAction];
}

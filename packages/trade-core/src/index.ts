import { prisma } from '@tradeos/database';
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

export const draftQuotationAction = registerAction<DraftQuotationInput, unknown>({
  name: 'trade.draftQuotation',
  description: 'Create a draft quotation. AI may draft, but human must review before sending.',
  riskLevel: 'MEDIUM',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    return prisma.quotation.create({
      data: {
        organizationId: input.organizationId,
        leadId: input.leadId,
        title: input.title,
        content: input.requirements,
        status: 'DRAFT',
        totalAmount: input.estimatedAmount,
        currency: input.currency,
      },
    });
  },
});

export const sendQuotationAction = registerAction<{ quotationId: string }, unknown>({
  name: 'trade.sendQuotation',
  description: 'Send a quotation to a customer. AI is not allowed to execute without approval.',
  riskLevel: 'HIGH',
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input) => {
    return prisma.quotation.update({
      where: { id: input.quotationId },
      data: { status: 'SENT' },
    });
  },
});

export const suggestPartnerAction = registerAction<SuggestPartnerInput, { suggestions: unknown[] }>({
  name: 'trade.suggestPartner',
  description: 'Suggest buyer, seller, logistics, or service partners for a trade need.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    const suggestions = await prisma.company.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.country ? { country: input.country } : {}),
        ...(input.category ? { industry: { contains: input.category, mode: 'insensitive' } } : {}),
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    return { suggestions };
  },
});

export function registerTradeActions() {
  return [draftQuotationAction, sendQuotationAction, suggestPartnerAction];
}

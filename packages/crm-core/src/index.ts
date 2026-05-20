import { prisma } from '@tradeos/database';
import { DEFAULT_LOW_RISK_ROLES, registerAction } from '@tradeos/policy-core';

export type CreateLeadInput = {
  organizationId: string;
  source: string;
  name?: string;
  phone?: string;
  email?: string;
  need?: string;
  aiSummary?: string;
  nextAction?: string;
};

export type CreateFollowUpTaskInput = {
  organizationId: string;
  leadId?: string;
  title: string;
  description?: string;
  dueAt?: string;
};

export const createLeadAction = registerAction<CreateLeadInput, unknown>({
  name: 'crm.createLead',
  description: 'Create a CRM lead from manual input or AI-extracted conversation data.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    return prisma.lead.create({
      data: {
        organizationId: input.organizationId,
        source: input.source,
        name: input.name,
        phone: input.phone,
        email: input.email,
        need: input.need,
        aiSummary: input.aiSummary,
        nextAction: input.nextAction,
      },
    });
  },
});

export const createFollowUpTaskAction = registerAction<CreateFollowUpTaskInput, unknown>({
  name: 'crm.createFollowUpTask',
  description: 'Create a follow-up task for a lead or customer.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    return prisma.task.create({
      data: {
        organizationId: input.organizationId,
        leadId: input.leadId,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      },
    });
  },
});

export function registerCrmActions() {
  return [createLeadAction, createFollowUpTaskAction];
}

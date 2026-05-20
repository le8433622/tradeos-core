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

export const createLeadAction = registerAction<CreateLeadInput, CreateLeadInput>({
  name: 'crm.createLead',
  description: 'Create a CRM lead from manual input or AI-extracted conversation data.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    // Replace with Prisma mutation in implementation phase.
    return input;
  },
});

export const createFollowUpTaskAction = registerAction<CreateFollowUpTaskInput, CreateFollowUpTaskInput>({
  name: 'crm.createFollowUpTask',
  description: 'Create a follow-up task for a lead or customer.',
  riskLevel: 'LOW',
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    // Replace with Prisma mutation in implementation phase.
    return input;
  },
});

export function registerCrmActions() {
  return [createLeadAction, createFollowUpTaskAction];
}

import { prisma, type ActionRiskLevel } from '@tradeos/database';
import { executeAction, type ActionContext } from '@tradeos/policy-core';

export type CreateApprovalRequestInput = {
  organizationId: string;
  requestedById?: string;
  actionName: string;
  riskLevel: ActionRiskLevel;
  input: unknown;
  reason?: string;
};

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  return prisma.approvalRequest.create({
    data: {
      organizationId: input.organizationId,
      requestedById: input.requestedById,
      actionName: input.actionName,
      riskLevel: input.riskLevel,
      input: JSON.parse(JSON.stringify(input.input)),
      reason: input.reason,
      status: 'PENDING',
    },
  });
}

export async function approveRequest(params: {
  approvalRequestId: string;
  reviewedById?: string;
  reviewNote?: string;
}) {
  return prisma.approvalRequest.update({
    where: { id: params.approvalRequestId },
    data: {
      status: 'APPROVED',
      reviewedById: params.reviewedById,
      reviewNote: params.reviewNote,
      reviewedAt: new Date(),
    },
  });
}

export async function rejectRequest(params: {
  approvalRequestId: string;
  reviewedById?: string;
  reviewNote?: string;
}) {
  return prisma.approvalRequest.update({
    where: { id: params.approvalRequestId },
    data: {
      status: 'REJECTED',
      reviewedById: params.reviewedById,
      reviewNote: params.reviewNote,
      reviewedAt: new Date(),
    },
  });
}

export async function executeApprovedRequest(params: {
  approvalRequestId: string;
  context: ActionContext;
}) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: params.approvalRequestId },
  });

  if (!request) throw new Error('APPROVAL_REQUEST_NOT_FOUND');
  if (request.status !== 'APPROVED') throw new Error('APPROVAL_REQUEST_NOT_APPROVED');

  const result = await executeAction(request.actionName, request.input, {
    ...params.context,
    organizationId: request.organizationId,
    approved: true,
  });

  return prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: 'EXECUTED',
      result: JSON.parse(JSON.stringify(result)),
      executedAt: new Date(),
    },
  });
}

export async function failApprovalRequest(params: {
  approvalRequestId: string;
  result: unknown;
}) {
  return prisma.approvalRequest.update({
    where: { id: params.approvalRequestId },
    data: {
      status: 'FAILED',
      result: JSON.parse(JSON.stringify(params.result)),
    },
  });
}

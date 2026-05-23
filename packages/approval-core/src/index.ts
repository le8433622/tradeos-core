import { prisma, type ActionRiskLevel } from "@tradeos/database";
import {
  executeAction,
  getAction,
  redactForAudit,
  type ActionContext,
} from "@tradeos/policy-core";
import { z } from "zod";

export type CreateApprovalRequestInput = {
  organizationId: string;
  requestedById?: string;
  actionName: string;
  input: unknown;
  reason?: string;
};

export const createApprovalRequestSchema = z
  .object({
    organizationId: z.string().min(1),
    requestedById: z.string().min(1).optional(),
    actionName: z.string().min(1).max(256),
    input: z.any().optional(),
    reason: z.string().max(2048).optional(),
  })
  .strict();

export const approveRequestSchema = z
  .object({
    approvalRequestId: z.string().min(1),
    reviewedById: z.string().min(1).optional(),
    organizationId: z.string().min(1),
    reviewNote: z.string().max(2048).optional(),
  })
  .strict();

export const rejectRequestSchema = z
  .object({
    approvalRequestId: z.string().min(1),
    reviewedById: z.string().min(1).optional(),
    organizationId: z.string().min(1),
    reviewNote: z.string().max(2048).optional(),
  })
  .strict();

const SESSION_MANAGED_FIELDS = new Set([
  "organizationId",
  "organization_id",
  "orgId",
]);

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["EXECUTING"],
  EXECUTING: ["EXECUTED", "FAILED"],
  REJECTED: [],
  EXECUTED: ["FAILED"],
  FAILED: [],
};

function assertValidTransition(current: string, next: string) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error(`INVALID_APPROVAL_TRANSITION: ${current} → ${next}`);
  }
}

function assertNoForeignTenantFields(
  value: unknown,
  organizationId: string,
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoForeignTenantFields(item, organizationId);
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SESSION_MANAGED_FIELDS.has(key)) {
      if (child !== undefined && child !== null && child !== organizationId) {
        throw new Error("ORGANIZATION_ACCESS_DENIED");
      }
      continue;
    }
    assertNoForeignTenantFields(child, organizationId);
  }
}

function normalizeApprovalInput(
  input: unknown,
  organizationId: string,
): Record<string, unknown> {
  const cloned = input === undefined ? {} : JSON.parse(JSON.stringify(input));
  assertNoForeignTenantFields(cloned, organizationId);
  if (cloned && typeof cloned === "object" && !Array.isArray(cloned)) {
    return { ...(cloned as Record<string, unknown>), organizationId };
  }
  return { organizationId, value: cloned };
}

async function writeApprovalAudit(params: {
  db?: Pick<typeof prisma, "auditLog">;
  organizationId: string;
  approvalRequestId: string;
  actionName: string;
  riskLevel: string;
  reviewedById?: string;
  fromStatus: string;
  toStatus: string;
  reviewNote?: string;
  auditActionName?: string;
}) {
  const db = params.db ?? prisma;
  await db.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.reviewedById,
      actionName:
        params.auditActionName ?? `approval.${params.toStatus.toLowerCase()}`,
      riskLevel: params.riskLevel as ActionRiskLevel,
      input: JSON.parse(
        JSON.stringify(
          redactForAudit({
            approvalRequestId: params.approvalRequestId,
            actionName: params.actionName,
            fromStatus: params.fromStatus,
          }),
        ),
      ),
      result: JSON.parse(
        JSON.stringify(
          redactForAudit({
            toStatus: params.toStatus,
            reviewNote: params.reviewNote,
          }),
        ),
      ),
      approved:
        params.toStatus === "APPROVED" || params.toStatus === "EXECUTED",
    },
  });
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  const action = getAction(input.actionName);
  if (!action) throw new Error("UNKNOWN_ACTION");
  const normalizedInput = normalizeApprovalInput(
    input.input,
    input.organizationId,
  );

  return prisma.$transaction(async (tx) => {
    const approval = await tx.approvalRequest.create({
      data: {
        organizationId: input.organizationId,
        requestedById: input.requestedById,
        actionName: input.actionName,
        riskLevel: action.riskLevel as ActionRiskLevel,
        input: JSON.parse(JSON.stringify(normalizedInput)),
        reason: input.reason,
        status: "PENDING",
      },
    });

    await writeApprovalAudit({
      db: tx as unknown as Pick<typeof prisma, "auditLog">,
      organizationId: input.organizationId,
      approvalRequestId: approval.id,
      actionName: input.actionName,
      riskLevel: action.riskLevel,
      reviewedById: input.requestedById,
      fromStatus: "NONE",
      toStatus: "PENDING",
      reviewNote: input.reason,
      auditActionName: "approval.create",
    });

    return approval;
  });
}

async function getApprovalWithTenantCheck(
  approvalRequestId: string,
  organizationId: string,
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
  });
  if (!request) throw new Error("APPROVAL_REQUEST_NOT_FOUND");
  if (request.organizationId !== organizationId)
    throw new Error("APPROVAL_ACCESS_DENIED");
  return request;
}

export async function approveRequest(params: {
  approvalRequestId: string;
  reviewedById?: string;
  organizationId: string;
  reviewNote?: string;
}) {
  const request = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );
  assertValidTransition(request.status, "APPROVED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.update({
      where: { id: params.approvalRequestId },
      data: {
        status: "APPROVED",
        reviewedById: params.reviewedById,
        reviewNote: params.reviewNote,
        reviewedAt: new Date(),
      },
    });

    await writeApprovalAudit({
      db: tx as unknown as Pick<typeof prisma, "auditLog">,
      organizationId: params.organizationId,
      approvalRequestId: params.approvalRequestId,
      actionName: request.actionName,
      riskLevel: request.riskLevel,
      reviewedById: params.reviewedById,
      fromStatus: request.status,
      toStatus: "APPROVED",
      reviewNote: params.reviewNote,
    });

    return updated;
  });
}

export async function rejectRequest(params: {
  approvalRequestId: string;
  reviewedById?: string;
  organizationId: string;
  reviewNote?: string;
}) {
  const request = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );
  assertValidTransition(request.status, "REJECTED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.update({
      where: { id: params.approvalRequestId },
      data: {
        status: "REJECTED",
        reviewedById: params.reviewedById,
        reviewNote: params.reviewNote,
        reviewedAt: new Date(),
      },
    });

    await writeApprovalAudit({
      db: tx as unknown as Pick<typeof prisma, "auditLog">,
      organizationId: params.organizationId,
      approvalRequestId: params.approvalRequestId,
      actionName: request.actionName,
      riskLevel: request.riskLevel,
      reviewedById: params.reviewedById,
      fromStatus: request.status,
      toStatus: "REJECTED",
      reviewNote: params.reviewNote,
    });

    return updated;
  });
}

export async function executeApprovedRequest(params: {
  approvalRequestId: string;
  organizationId: string;
  context: ActionContext;
}) {
  const claim = await prisma.approvalRequest.updateMany({
    where: {
      id: params.approvalRequestId,
      organizationId: params.organizationId,
      status: "APPROVED",
    },
    data: { status: "EXECUTING" },
  });

  if (claim.count === 0) {
    const existing = await prisma.approvalRequest.findUnique({
      where: { id: params.approvalRequestId },
    });
    if (!existing) throw new Error("APPROVAL_REQUEST_NOT_FOUND");
    if (existing.organizationId !== params.organizationId)
      throw new Error("APPROVAL_ACCESS_DENIED");
    throw new Error("APPROVAL_NOT_CLAIMED");
  }

  const request = await prisma.approvalRequest.findUnique({
    where: { id: params.approvalRequestId },
  });
  if (!request) throw new Error("APPROVAL_REQUEST_NOT_FOUND");

  try {
    const result = await executeAction(request.actionName, request.input, {
      ...params.context,
      organizationId: request.organizationId,
      approved: true,
    });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: "EXECUTED",
          result: JSON.parse(JSON.stringify(result)),
          executedAt: new Date(),
        },
      });

      await writeApprovalAudit({
        db: tx as unknown as Pick<typeof prisma, "auditLog">,
        organizationId: params.organizationId,
        approvalRequestId: params.approvalRequestId,
        actionName: request.actionName,
        riskLevel: request.riskLevel,
        reviewedById: params.context.actorUserId,
        fromStatus: "APPROVED",
        toStatus: "EXECUTED",
      });

      return updated;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    await prisma.$transaction(async (tx) => {
      await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: "FAILED",
          result: { error: message },
        },
      });

      await writeApprovalAudit({
        db: tx as unknown as Pick<typeof prisma, "auditLog">,
        organizationId: params.organizationId,
        approvalRequestId: params.approvalRequestId,
        actionName: request.actionName,
        riskLevel: request.riskLevel,
        reviewedById: params.context.actorUserId,
        fromStatus: "EXECUTING",
        toStatus: "FAILED",
      });
    });

    throw error;
  }
}

export async function failApprovalRequest(params: {
  approvalRequestId: string;
  organizationId: string;
  result: unknown;
}) {
  const request = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );
  assertValidTransition(request.status, "FAILED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.update({
      where: { id: params.approvalRequestId },
      data: {
        status: "FAILED",
        result: JSON.parse(JSON.stringify(params.result)),
      },
    });

    await writeApprovalAudit({
      db: tx as unknown as Pick<typeof prisma, "auditLog">,
      organizationId: params.organizationId,
      approvalRequestId: params.approvalRequestId,
      actionName: request.actionName,
      riskLevel: request.riskLevel,
      fromStatus: request.status,
      toStatus: "FAILED",
    });

    return updated;
  });
}

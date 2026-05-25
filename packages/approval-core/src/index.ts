import { createHash } from "node:crypto";
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
  idempotencyKey?: string;
  maxRetries?: number;
};

export const createApprovalRequestSchema = z
  .object({
    organizationId: z.string().min(1),
    requestedById: z.string().min(1).optional(),
    actionName: z.string().min(1).max(256),
    input: z.any().optional(),
    reason: z.string().max(2048).optional(),
    idempotencyKey: z.string().max(256).optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
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

export const retryApprovalRequestSchema = z
  .object({
    approvalRequestId: z.string().min(1),
    organizationId: z.string().min(1),
    requestedById: z.string().min(1).optional(),
    reason: z.string().max(2048).optional(),
  })
  .strict();

export const recoverStaleRequestSchema = z
  .object({
    approvalRequestId: z.string().min(1),
    organizationId: z.string().min(1),
    reviewedById: z.string().min(1).optional(),
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

const DEFAULT_STALE_TIMEOUT_MS = 5 * 60 * 1000;
const RISK_TIMEOUT_MS: Record<string, number> = {
  LOW: 2 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  HIGH: 10 * 60 * 1000,
  CRITICAL: 15 * 60 * 1000,
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

function generateIdempotencyKey(
  organizationId: string,
  actionName: string,
  input: unknown,
): string {
  const hash = createHash("sha256")
    .update(`${organizationId}:${actionName}:${JSON.stringify(input)}`)
    .digest("hex");
  return `ik_${hash}`;
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
  const idempotencyKey =
    input.idempotencyKey ??
    generateIdempotencyKey(
      input.organizationId,
      input.actionName,
      normalizedInput,
    );

  const existing = await prisma.approvalRequest.findFirst({
    where: {
      organizationId: input.organizationId,
      idempotencyKey,
      status: { in: ["EXECUTED", "FAILED"] },
    },
  });
  if (existing) return existing;

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
        idempotencyKey,
        maxRetries: input.maxRetries ?? 3,
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
  const approval = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );

  if (approval.idempotencyKey) {
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        organizationId: params.organizationId,
        idempotencyKey: approval.idempotencyKey,
        status: { in: ["EXECUTED", "FAILED"] },
        id: { not: approval.id },
      },
    });
    if (existing) {
      return existing;
    }
  }

  const claim = await prisma.approvalRequest.updateMany({
    where: {
      id: params.approvalRequestId,
      organizationId: params.organizationId,
      status: "APPROVED",
    },
    data: {
      status: "EXECUTING",
      executingSince: new Date(),
      lockedBy: params.context.actorUserId ?? "system",
    },
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

export async function findStaleExecutingRequests(params: {
  organizationId?: string;
  timeoutMs?: number;
}) {
  const timeout = params.timeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
  const cutoff = new Date(Date.now() - timeout);

  return prisma.approvalRequest.findMany({
    where: {
      status: "EXECUTING",
      executingSince: { lt: cutoff },
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : {}),
    },
    orderBy: { executingSince: "asc" },
  });
}

export async function recoverStaleRequest(params: {
  approvalRequestId: string;
  organizationId: string;
  reviewedById?: string;
  reviewNote?: string;
}) {
  const request = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );
  if (request.status !== "EXECUTING") {
    throw new Error("APPROVAL_NOT_EXECUTING");
  }

  const isHighRisk =
    request.riskLevel === "HIGH" || request.riskLevel === "CRITICAL";
  const hasRetryBudget =
    request.retryCount < request.maxRetries;

  if (isHighRisk || !hasRetryBudget) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: "FAILED",
          result: {
            error: "STALE_EXECUTION",
            recoveredAt: new Date().toISOString(),
            riskLevel: request.riskLevel,
            reviewNote: params.reviewNote ?? "Stale execution recovered",
          },
        },
      });

      await writeApprovalAudit({
        db: tx as unknown as Pick<typeof prisma, "auditLog">,
        organizationId: params.organizationId,
        approvalRequestId: params.approvalRequestId,
        actionName: request.actionName,
        riskLevel: request.riskLevel,
        reviewedById: params.reviewedById,
        fromStatus: "EXECUTING",
        toStatus: "FAILED",
        reviewNote: params.reviewNote,
        auditActionName: "approval.stale_recovered",
      });

      return updated;
    });
  }

  return retryApprovalRequest({
    approvalRequestId: request.id,
    organizationId: params.organizationId,
    requestedById: params.reviewedById,
    reason: params.reviewNote ?? "Auto-retry after stale execution",
  });
}

export async function retryApprovalRequest(params: {
  approvalRequestId: string;
  organizationId: string;
  requestedById?: string;
  reason?: string;
}) {
  const parent = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );

  const hasActive = await prisma.approvalRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      parentApprovalRequestId: params.approvalRequestId,
      status: { in: ["PENDING", "APPROVED", "EXECUTING"] },
    },
  });
  if (hasActive) {
    throw new Error("RETRY_CHAIN_ACTIVE");
  }

  const retryChainId = parent.retryChainId ?? parent.id;

  return prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id: parent.id },
      data: {
        deprecatedAt: new Date(),
      },
    });

    const approval = await tx.approvalRequest.create({
      data: {
        organizationId: parent.organizationId,
        requestedById: params.requestedById,
        actionName: parent.actionName,
        riskLevel: parent.riskLevel,
        input: JSON.parse(JSON.stringify(parent.input)),
        reason: params.reason ?? `Retry of ${parent.id}`,
        status: "PENDING",
        idempotencyKey: parent.idempotencyKey,
        retryCount: parent.retryCount + 1,
        maxRetries: parent.maxRetries,
        parentApprovalRequestId: parent.id,
        retryChainId,
      },
    });

    await tx.approvalRequest.update({
      where: { id: parent.id },
      data: { supersededById: approval.id },
    });

    await writeApprovalAudit({
      db: tx as unknown as Pick<typeof prisma, "auditLog">,
      organizationId: params.organizationId,
      approvalRequestId: approval.id,
      actionName: parent.actionName,
      riskLevel: parent.riskLevel,
      reviewedById: params.requestedById,
      fromStatus: parent.status,
      toStatus: "PENDING",
      reviewNote: params.reason,
      auditActionName: "approval.retry",
    });

    return approval;
  });
}

export async function getRetryChain(params: {
  approvalRequestId: string;
  organizationId: string;
}) {
  const request = await getApprovalWithTenantCheck(
    params.approvalRequestId,
    params.organizationId,
  );
  const chainId = request.retryChainId ?? request.id;

  const chain = await prisma.approvalRequest.findMany({
    where: {
      organizationId: params.organizationId,
      OR: [{ retryChainId: chainId }, { id: chainId }],
    },
    orderBy: { createdAt: "asc" },
  });

  return chain;
}

export async function getIdempotencyResult(params: {
  organizationId: string;
  idempotencyKey: string;
}) {
  return prisma.approvalRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      idempotencyKey: params.idempotencyKey,
      status: { in: ["EXECUTED", "FAILED"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

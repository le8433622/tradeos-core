import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockApprovalCreate = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock("@tradeos/database", () => ({
  prisma: {
    $transaction: vi.fn((cb: (tx: unknown) => unknown) =>
      cb({
        approvalRequest: {
          updateMany: mockUpdateMany,
          findUnique: mockFindUnique,
          findFirst: mockFindFirst,
          findMany: mockFindMany,
          update: mockUpdate,
          create: mockApprovalCreate,
        },
        auditLog: {
          create: mockAuditCreate,
        },
      }),
    ),
    approvalRequest: {
      updateMany: mockUpdateMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      update: mockUpdate,
      create: mockApprovalCreate,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}));

vi.mock("@tradeos/policy-core", () => ({
  executeAction: vi.fn(),
  getAction: vi.fn(() => ({ name: "trade.sendQuotation", riskLevel: "HIGH" })),
  redactForAudit: (value: unknown) => value,
}));

const {
  createApprovalRequest,
  approveRequest,
  rejectRequest,
  executeApprovedRequest,
  failApprovalRequest,
  findStaleExecutingRequests,
  recoverStaleRequest,
  retryApprovalRequest,
  getRetryChain,
  getIdempotencyResult,
} = await import("../index");
const { executeAction } = await import("@tradeos/policy-core");

const MOCK_CONTEXT = {
  actorUserId: "user-1",
  organizationId: "org-1",
  role: "ADMIN" as const,
  source: "manual" as const,
  approved: true,
};

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    organizationId: "org-1",
    actionName: "trade.sendQuotation",
    input: { quotationId: "q-1" },
    riskLevel: "HIGH",
    status: "APPROVED",
    executedAt: null,
    result: null,
    idempotencyKey: null,
    executingSince: null,
    lockedBy: null,
    retryCount: 0,
    maxRetries: 3,
    expiresAt: null,
    parentApprovalRequestId: null,
    retryChainId: null,
    supersededById: null,
    deprecatedAt: null,
    createdAt: new Date("2025-01-01"),
    reviewedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("atomic claim", () => {
  it("claims with updateMany and executes on success", async () => {
    const approval = makeApproval();
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({
      ...approval,
      status: "EXECUTED",
      executedAt: new Date(),
    });
    vi.mocked(executeAction).mockResolvedValue({ ok: true });

    const result = await executeApprovedRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      context: MOCK_CONTEXT,
    });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "approval-1", organizationId: "org-1", status: "APPROVED" },
      data: {
        status: "EXECUTING",
        executingSince: expect.any(Date),
        lockedBy: "user-1",
      },
    });
    expect(vi.mocked(executeAction)).toHaveBeenCalledOnce();
    expect(result.status).toBe("EXECUTED");
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "approval.executed",
          approved: true,
        }),
      }),
    );
  });

  it("throws APPROVAL_NOT_CLAIMED when updateMany returns 0 and record exists", async () => {
    const approval = makeApproval({ status: "EXECUTED" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      executeApprovedRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
        context: MOCK_CONTEXT,
      }),
    ).rejects.toThrow("APPROVAL_NOT_CLAIMED");

    expect(vi.mocked(executeAction)).not.toHaveBeenCalled();
  });

  it("throws APPROVAL_ACCESS_DENIED when org mismatches", async () => {
    const approval = makeApproval({ organizationId: "org-2" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      executeApprovedRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
        context: MOCK_CONTEXT,
      }),
    ).rejects.toThrow("APPROVAL_ACCESS_DENIED");
  });

  it("transitions to FAILED on action error", async () => {
    const approval = makeApproval();
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({
      ...approval,
      status: "FAILED",
      result: { error: "SEND_FAILED" },
    });
    vi.mocked(executeAction).mockRejectedValue(new Error("SEND_FAILED"));

    await expect(
      executeApprovedRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
        context: MOCK_CONTEXT,
      }),
    ).rejects.toThrow("SEND_FAILED");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "approval.failed",
          approved: false,
        }),
      }),
    );
  });
});

describe("createApprovalRequest", () => {
  it("normalizes tenant input and derives risk from the action registry", async () => {
    const approval = makeApproval({
      status: "PENDING",
      input: { quotationId: "q-1", organizationId: "org-1" },
    });
    mockFindFirst.mockResolvedValue(null);
    mockApprovalCreate.mockResolvedValue(approval);

    const result = await createApprovalRequest({
      organizationId: "org-1",
      requestedById: "user-1",
      actionName: "trade.sendQuotation",
      input: { quotationId: "q-1" },
      reason: "Send quote",
    });

    expect(result).toBe(approval);
    expect(mockApprovalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        actionName: "trade.sendQuotation",
        riskLevel: "HIGH",
        input: { quotationId: "q-1", organizationId: "org-1" },
        idempotencyKey: expect.stringMatching(/^ik_/),
        maxRetries: 3,
      }),
    });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionName: "approval.create" }),
      }),
    );
  });

  it("skips duplicate creation when idempotency key matches existing", async () => {
    const existing = makeApproval({
      id: "existing-1",
      status: "EXECUTED",
      idempotencyKey: "ik_already_done",
    });
    mockFindFirst.mockResolvedValue(existing);

    const result = await createApprovalRequest({
      organizationId: "org-1",
      actionName: "trade.sendQuotation",
      input: { quotationId: "q-1" },
      idempotencyKey: "ik_already_done",
    });

    expect(result).toBe(existing);
    expect(mockApprovalCreate).not.toHaveBeenCalled();
  });

  it("rejects nested foreign tenant identifiers before storage", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      createApprovalRequest({
        organizationId: "org-1",
        requestedById: "user-1",
        actionName: "trade.sendQuotation",
        input: { payload: { organizationId: "org-2" } },
        reason: "Bad tenant",
      }),
    ).rejects.toThrow("ORGANIZATION_ACCESS_DENIED");

    expect(mockApprovalCreate).not.toHaveBeenCalled();
  });
});

describe("failApprovalRequest", () => {
  it("transitions EXECUTING to FAILED", async () => {
    const approval = makeApproval({ status: "EXECUTING" });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({ ...approval, status: "FAILED" });

    const result = await failApprovalRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      result: { error: "timeout" },
    });

    expect(result.status).toBe("FAILED");
  });

  it("throws on invalid transition from REJECTED", async () => {
    const approval = makeApproval({ status: "REJECTED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      failApprovalRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
        result: { error: "timeout" },
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
  });
});

describe("approveRequest", () => {
  it("transitions PENDING to APPROVED and writes audit log", async () => {
    const approval = makeApproval({
      status: "PENDING",
      reviewedById: null,
      reviewNote: null,
      reviewedAt: null,
    });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({
      ...approval,
      status: "APPROVED",
      reviewedById: "user-2",
      reviewNote: "Looks good",
      reviewedAt: new Date(),
    });

    const result = await approveRequest({
      approvalRequestId: "approval-1",
      reviewedById: "user-2",
      organizationId: "org-1",
      reviewNote: "Looks good",
    });

    expect(result.status).toBe("APPROVED");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "approval-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        reviewedById: "user-2",
        reviewNote: "Looks good",
      }),
    });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "approval.approved",
          actorUserId: "user-2",
          approved: true,
        }),
      }),
    );
  });

  it("throws INVALID_APPROVAL_TRANSITION when already APPROVED", async () => {
    const approval = makeApproval({ status: "APPROVED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      approveRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws INVALID_APPROVAL_TRANSITION when already REJECTED", async () => {
    const approval = makeApproval({ status: "REJECTED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      approveRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws APPROVAL_REQUEST_NOT_FOUND for non-existent request", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      approveRequest({
        approvalRequestId: "approval-999",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("APPROVAL_REQUEST_NOT_FOUND");
  });

  it("throws APPROVAL_ACCESS_DENIED on org mismatch", async () => {
    const approval = makeApproval({
      status: "PENDING",
      organizationId: "org-2",
    });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      approveRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("APPROVAL_ACCESS_DENIED");
  });
});

describe("rejectRequest", () => {
  it("transitions PENDING to REJECTED and writes audit log with note", async () => {
    const approval = makeApproval({
      status: "PENDING",
      reviewedById: null,
      reviewNote: null,
      reviewedAt: null,
    });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({
      ...approval,
      status: "REJECTED",
      reviewedById: "user-2",
      reviewNote: "Not now",
      reviewedAt: new Date(),
    });

    const result = await rejectRequest({
      approvalRequestId: "approval-1",
      reviewedById: "user-2",
      organizationId: "org-1",
      reviewNote: "Not now",
    });

    expect(result.status).toBe("REJECTED");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "approval-1" },
      data: expect.objectContaining({
        status: "REJECTED",
        reviewedById: "user-2",
        reviewNote: "Not now",
      }),
    });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "approval.rejected",
          actorUserId: "user-2",
          approved: false,
        }),
      }),
    );
  });

  it("throws INVALID_APPROVAL_TRANSITION when already APPROVED", async () => {
    const approval = makeApproval({ status: "APPROVED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      rejectRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws INVALID_APPROVAL_TRANSITION when already REJECTED", async () => {
    const approval = makeApproval({ status: "REJECTED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      rejectRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws APPROVAL_REQUEST_NOT_FOUND for non-existent request", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      rejectRequest({
        approvalRequestId: "approval-999",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("APPROVAL_REQUEST_NOT_FOUND");
  });

  it("throws APPROVAL_ACCESS_DENIED on org mismatch", async () => {
    const approval = makeApproval({
      status: "PENDING",
      organizationId: "org-2",
    });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      rejectRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("APPROVAL_ACCESS_DENIED");
  });
});

describe("assertValidTransition edge cases via public API", () => {
  it("EXECUTED → FAILED is valid via failApprovalRequest", async () => {
    const approval = makeApproval({ status: "EXECUTED" });
    mockFindUnique.mockResolvedValue(approval);
    mockUpdate.mockResolvedValue({ ...approval, status: "FAILED" });

    const result = await failApprovalRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      result: { error: "post-execution failure" },
    });

    expect(result.status).toBe("FAILED");
  });

  it("PENDING → EXECUTING is invalid — updateMany with status:APPROVED filter skips PENDING records", async () => {
    const approval = makeApproval({ status: "PENDING" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      executeApprovedRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
        context: MOCK_CONTEXT,
      }),
    ).rejects.toThrow("APPROVAL_NOT_CLAIMED");
  });

  it("APPROVED → APPROVED is invalid via approveRequest", async () => {
    const approval = makeApproval({ status: "APPROVED" });
    mockFindUnique.mockResolvedValue(approval);

    await expect(
      approveRequest({
        approvalRequestId: "approval-1",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("INVALID_APPROVAL_TRANSITION");
  });
});

describe("idempotency", () => {
  it("returns existing result when same idempotency key already executed", async () => {
    const approval = makeApproval({ idempotencyKey: "ik_existing" });
    const existingExecuted = makeApproval({
      id: "already-done",
      status: "EXECUTED",
      idempotencyKey: "ik_existing",
      result: { ok: true },
    });
    mockFindUnique.mockResolvedValue(approval);
    mockFindFirst.mockResolvedValue(existingExecuted);

    const result = await executeApprovedRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      context: MOCK_CONTEXT,
    });

    expect(result).toBe(existingExecuted);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(vi.mocked(executeAction)).not.toHaveBeenCalled();
  });

  it("still executes when idempotency key has no prior result", async () => {
    const approval = makeApproval({ idempotencyKey: "ik_fresh" });
    mockFindUnique.mockResolvedValue(approval);
    mockFindFirst.mockResolvedValue(null);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockUpdate.mockResolvedValue({
      ...approval,
      status: "EXECUTED",
      executedAt: new Date(),
    });
    vi.mocked(executeAction).mockResolvedValue({ ok: true });

    const result = await executeApprovedRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      context: MOCK_CONTEXT,
    });

    expect(result.status).toBe("EXECUTED");
    expect(mockUpdateMany).toHaveBeenCalled();
    expect(vi.mocked(executeAction)).toHaveBeenCalledOnce();
  });
});

describe("findStaleExecutingRequests", () => {
  it("finds EXECUTING records older than timeout", async () => {
    const stale = makeApproval({
      id: "stale-1",
      status: "EXECUTING",
      executingSince: new Date(Date.now() - 10 * 60 * 1000),
    });
    mockFindMany.mockResolvedValue([stale]);

    const result = await findStaleExecutingRequests({
      organizationId: "org-1",
      timeoutMs: 5 * 60 * 1000,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("stale-1");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "EXECUTING",
          executingSince: expect.objectContaining({ lt: expect.any(Date) }),
          organizationId: "org-1",
        }),
      }),
    );
  });
});

describe("recoverStaleRequest", () => {
  it("marks HIGH-risk stale as FAILED requiring human review", async () => {
    const stale = makeApproval({
      status: "EXECUTING",
      executingSince: new Date(Date.now() - 10 * 60 * 1000),
      riskLevel: "HIGH",
    });
    mockFindUnique.mockResolvedValue(stale);
    mockUpdate.mockResolvedValue({ ...stale, status: "FAILED" });

    const result = await recoverStaleRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
      reviewNote: "Stale recovery",
    });

    expect(result.status).toBe("FAILED");
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionName: "approval.stale_recovered" }),
      }),
    );
  });

  it("auto-retries LOW-risk stale request within retry budget", async () => {
    const stale = makeApproval({
      status: "EXECUTING",
      riskLevel: "LOW",
      retryCount: 0,
      maxRetries: 3,
    });
    mockFindUnique.mockResolvedValue(stale);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ ...stale, deprecatedAt: new Date() });
    mockApprovalCreate.mockResolvedValue({
      ...stale,
      id: "retry-1",
      status: "PENDING",
      retryCount: 1,
      parentApprovalRequestId: "approval-1",
    });

    const result = await recoverStaleRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
    });

    expect(result.status).toBe("PENDING");
    expect(result.parentApprovalRequestId).toBe("approval-1");
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionName: "approval.retry" }),
      }),
    );
  });

  it("fails if no retry budget remains", async () => {
    const stale = makeApproval({
      status: "EXECUTING",
      riskLevel: "LOW",
      retryCount: 3,
      maxRetries: 3,
    });
    mockFindUnique.mockResolvedValue(stale);
    mockUpdate.mockResolvedValue({ ...stale, status: "FAILED" });

    const result = await recoverStaleRequest({
      approvalRequestId: "approval-1",
      organizationId: "org-1",
    });

    expect(result.status).toBe("FAILED");
  });
});

describe("retryApprovalRequest", () => {
  it("creates a retry linked to the parent and supersedes the old", async () => {
    const parent = makeApproval({ status: "FAILED" });
    mockFindUnique.mockResolvedValue(parent);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ ...parent, deprecatedAt: new Date(), supersededById: "retry-1" });
    mockApprovalCreate.mockResolvedValue({
      ...parent,
      id: "retry-1",
      status: "PENDING",
      retryCount: 1,
      parentApprovalRequestId: parent.id,
    });

    const result = await retryApprovalRequest({
      approvalRequestId: parent.id,
      organizationId: "org-1",
      reason: "Retrying after failure",
    });

    expect(result.status).toBe("PENDING");
    expect(result.parentApprovalRequestId).toBe(parent.id);
    expect(result.retryCount).toBe(1);
    expect(mockApprovalCreate).toHaveBeenCalled();
  });

  it("throws RETRY_CHAIN_ACTIVE if a retry is already in progress", async () => {
    const parent = makeApproval({ status: "FAILED" });
    mockFindUnique.mockResolvedValue(parent);
    mockFindFirst.mockResolvedValue({ id: "active-retry", status: "PENDING" });

    await expect(
      retryApprovalRequest({
        approvalRequestId: parent.id,
        organizationId: "org-1",
      }),
    ).rejects.toThrow("RETRY_CHAIN_ACTIVE");
  });
});

describe("getRetryChain", () => {
  it("returns all requests in a retry chain", async () => {
    const original = makeApproval({ id: "original-1", retryChainId: null });
    const retry1 = makeApproval({ id: "retry-1", retryChainId: "original-1", parentApprovalRequestId: "original-1" });
    mockFindUnique.mockResolvedValue(original);
    mockFindMany.mockResolvedValue([original, retry1]);

    const result = await getRetryChain({
      approvalRequestId: "original-1",
      organizationId: "org-1",
    });

    expect(result).toHaveLength(2);
  });
});

describe("getIdempotencyResult", () => {
  it("returns existing executed/failed result by idempotency key", async () => {
    const existing = makeApproval({
      id: "existing-1",
      status: "EXECUTED",
      idempotencyKey: "ik_test",
      result: { ok: true },
    });
    mockFindFirst.mockResolvedValue(existing);

    const result = await getIdempotencyResult({
      organizationId: "org-1",
      idempotencyKey: "ik_test",
    });

    expect(result).toBe(existing);
  });

  it("returns null when no result exists", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getIdempotencyResult({
      organizationId: "org-1",
      idempotencyKey: "ik_nonexistent",
    });

    expect(result).toBeNull();
  });
});

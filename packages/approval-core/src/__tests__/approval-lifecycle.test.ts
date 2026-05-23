import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateMany = vi.fn();
const mockFindUnique = vi.fn();
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
      data: { status: "EXECUTING" },
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
      }),
    });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionName: "approval.create" }),
      }),
    );
  });

  it("rejects nested foreign tenant identifiers before storage", async () => {
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

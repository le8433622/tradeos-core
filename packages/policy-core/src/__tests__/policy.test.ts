import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tradeos/database", () => {
  const createMock = vi.fn().mockResolvedValue({ id: "log-1" });
  return {
    prisma: {
      $transaction: vi.fn((cb: (tx: unknown) => unknown) =>
        cb({ auditLog: { create: createMock } }),
      ),
      auditLog: { create: createMock },
      organization: { findUnique: vi.fn() },
    },
  };
});

import { prisma } from "@tradeos/database";

import {
  registerAction,
  canExecuteAction,
  executeAction,
  getAction,
  listActions,
  type RegisteredAction,
  type ActionContext,
} from "../index";

function makeAction(
  overrides: Partial<RegisteredAction> = {},
): RegisteredAction {
  return {
    name: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "Test action",
    riskLevel: "LOW",
    allowedRoles: ["OWNER", "ADMIN", "SALES"],
    requiresApprovalForAI: false,
    handler: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

describe("canExecuteAction", () => {
  const ctx: ActionContext = { role: "ADMIN", source: "manual" };

  it("allows an allowed role", () => {
    const action = makeAction({ allowedRoles: ["ADMIN"] });
    const result = canExecuteAction(action, { ...ctx, role: "ADMIN" });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("ALLOWED");
  });

  it("blocks a denied role", () => {
    const action = makeAction({ allowedRoles: ["ADMIN"] });
    const result = canExecuteAction(action, { ...ctx, role: "VIEWER" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ROLE_NOT_ALLOWED");
  });

  it("blocks AI high-risk action without approval", () => {
    const action = makeAction({ requiresApprovalForAI: true });
    const result = canExecuteAction(action, {
      role: "ADMIN",
      source: "ai",
      approved: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("AI_REQUIRES_HUMAN_APPROVAL");
  });

  it("allows AI high-risk action with approval", () => {
    const action = makeAction({ requiresApprovalForAI: true });
    const result = canExecuteAction(action, {
      role: "ADMIN",
      source: "ai",
      approved: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("allows AI low-risk action without approval", () => {
    const action = makeAction({ requiresApprovalForAI: false });
    const result = canExecuteAction(action, { role: "ADMIN", source: "ai" });
    expect(result.allowed).toBe(true);
  });

  it("allows manual source for high-risk action", () => {
    const action = makeAction({ requiresApprovalForAI: true });
    const result = canExecuteAction(action, {
      role: "ADMIN",
      source: "manual",
    });
    expect(result.allowed).toBe(true);
  });
});

describe("registerAction", () => {
  it("registers a new action", () => {
    const action = makeAction({ name: "test.register-new" });
    const result = registerAction(action);
    expect(result).toBe(action);
    expect(getAction("test.register-new")).toBe(action);
  });

  it("returns existing action on re-registration with same name", async () => {
    const name = "test.register-dup";
    const first = makeAction({
      name,
      handler: vi.fn().mockResolvedValue({ first: true }),
    });
    const second = makeAction({
      name,
      handler: vi.fn().mockResolvedValue({ second: true }),
    });
    const registered1 = registerAction(first);
    const registered2 = registerAction(second);
    expect(registered1).toBe(first);
    expect(registered2).toBe(first);
    const result = await registered1.handler({}, {} as ActionContext);
    expect(result).toEqual({ first: true });
  });

  it("handles different names separately", () => {
    const a1 = makeAction({ name: "test.multi-1" });
    const a2 = makeAction({ name: "test.multi-2" });
    registerAction(a1);
    registerAction(a2);
    const actions = listActions();
    const names = actions.map((a) => a.name).sort();
    expect(names).toContain("test.multi-1");
    expect(names).toContain("test.multi-2");
  });
});

describe("executeAction", () => {
  it("executes allowed action and returns handler result", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const action = makeAction({ name: "test.exec-ok", handler });
    registerAction(action);
    const result = await executeAction(
      "test.exec-ok",
      { foo: 1 },
      { role: "ADMIN", source: "manual" },
    );
    expect(result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("throws on unknown action", async () => {
    await expect(
      executeAction("does.not.exist", {}, { role: "ADMIN", source: "manual" }),
    ).rejects.toThrow("Unknown action: does.not.exist");
  });

  it("throws on denied role", async () => {
    const action = makeAction({
      name: "test.exec-deny",
      allowedRoles: ["OWNER"],
    });
    registerAction(action);
    await expect(
      executeAction("test.exec-deny", {}, { role: "VIEWER", source: "manual" }),
    ).rejects.toThrow("Action blocked: ROLE_NOT_ALLOWED");
    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approved: false,
          result: expect.objectContaining({ blockReason: "role_denied" }),
        }),
      }),
    );
  });

  it("throws when AI tries high-risk action without approval", async () => {
    const action = makeAction({
      name: "test.exec-ai-block",
      requiresApprovalForAI: true,
    });
    registerAction(action);
    await expect(
      executeAction("test.exec-ai-block", {}, { role: "ADMIN", source: "ai" }),
    ).rejects.toThrow("Action blocked: AI_REQUIRES_HUMAN_APPROVAL");
  });

  it("allows AI high-risk action when context is approved", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const action = makeAction({
      name: "test.exec-ai-ok",
      requiresApprovalForAI: true,
      handler,
    });
    registerAction(action);
    const result = await executeAction(
      "test.exec-ai-ok",
      {},
      { role: "ADMIN", source: "ai", approved: true },
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects top-level organizationId mismatch before executing handler", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const action = makeAction({ name: "test.exec-org-mismatch", handler });
    registerAction(action);
    await expect(
      executeAction(
        "test.exec-org-mismatch",
        { organizationId: "org-a" },
        { role: "ADMIN", source: "manual", organizationId: "org-b" },
      ),
    ).rejects.toThrow("ORGANIZATION_ACCESS_DENIED");
    expect(handler).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approved: false,
          result: expect.objectContaining({
            blockReason: "input_organization_mismatch",
          }),
        }),
      }),
    );
  });

  it("writes blocked audit log when MFA is required", async () => {
    const action = makeAction({
      name: "privacy.export",
      riskLevel: "HIGH",
      allowedRoles: ["OWNER"],
    });
    registerAction(action);

    await expect(
      executeAction(
        "privacy.export",
        { organizationId: "org-1" },
        {
          role: "OWNER",
          source: "manual",
          organizationId: "org-1",
          mfaLevel: "aal1",
        },
      ),
    ).rejects.toThrow("MFA_REQUIRED");

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "privacy.export",
          approved: false,
          result: expect.objectContaining({
            reason: "MFA_REQUIRED",
            blockReason: "mfa_required",
          }),
        }),
      }),
    );
  });

  it("allows context-scoped actions without input organizationId", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const action = makeAction({ name: "test.exec-context-org", handler });
    registerAction(action);
    const result = await executeAction(
      "test.exec-context-org",
      { id: "record-1" },
      { role: "ADMIN", source: "manual", organizationId: "org-a" },
    );
    expect(result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("redactAuditField", () => {
  it("redacts sensitive keys", async () => {
    const { redactAuditField } = await import("../index");
    const input = { name: "test", apiKey: "sk-123", secret: "s3cret" };
    const result = redactAuditField(input);
    expect(result).toEqual({
      name: "test",
      apiKey: "[REDACTED]",
      secret: "[REDACTED]",
    });
  });

  it("handles nested objects", async () => {
    const { redactAuditField } = await import("../index");
    const input = {
      user: { name: "alice", token: "abc" },
      data: { items: [{ password: "pwd" }] },
    };
    const result = redactAuditField(input);
    expect(result).toEqual({
      user: { name: "alice", token: "[REDACTED]" },
      data: { items: [{ password: "[REDACTED]" }] },
    });
  });

  it("passes through null and primitives", async () => {
    const { redactAuditField } = await import("../index");
    expect(redactAuditField(null)).toBe(null);
    expect(redactAuditField("hello")).toBe("hello");
    expect(redactAuditField(42)).toBe(42);
  });

  it("masks email addresses in string values", async () => {
    const { redactAuditField } = await import("../index");
    const result = redactAuditField({ email: "alice@example.com" });
    expect(result).toEqual({ email: "a***e@example.com" });
  });

  it("masks phone numbers in string values", async () => {
    const { redactAuditField } = await import("../index");
    const result = redactAuditField({ phone: "+84912345678" });
    expect(result).toEqual({ phone: "+84*****5678" });
  });

  it("masks email inside nested objects", async () => {
    const { redactAuditField } = await import("../index");
    const input = { contact: { email: "user@domain.com", name: "test" } };
    const result = redactAuditField(input);
    expect(result).toEqual({
      contact: { email: "u**r@domain.com", name: "test" },
    });
  });

  it("masks phone inside arrays", async () => {
    const { redactAuditField } = await import("../index");
    const input = { contacts: [{ phone: "0123456789" }] };
    const result = redactAuditField(input);
    expect(result).toEqual({ contacts: [{ phone: "012***6789" }] });
  });
});

describe("assertPermission / hasPermission / can", () => {
  it("assertPermission does not throw when permission exists", async () => {
    const { assertPermission } = await import("../index");
    expect(() =>
      assertPermission(["lead.read", "lead.write"], "lead.read"),
    ).not.toThrow();
  });

  it("assertPermission throws PERMISSION_DENIED when missing", async () => {
    const { assertPermission } = await import("../index");
    expect(() => assertPermission(["lead.read"], "lead.write")).toThrow(
      "PERMISSION_DENIED",
    );
  });

  it("hasPermission returns true/false correctly", async () => {
    const { hasPermission } = await import("../index");
    expect(hasPermission(["a", "b"], "a")).toBe(true);
    expect(hasPermission(["a", "b"], "c")).toBe(false);
  });

  it("can is an alias for hasPermission", async () => {
    const { can } = await import("../index");
    expect(can(["x", "y"], "x")).toBe(true);
    expect(can(["x", "y"], "z")).toBe(false);
  });
});

describe("isActionMfaRequired", () => {
  it("returns true for always-require MFA actions", async () => {
    const { isActionMfaRequired } = await import("../index");
    expect(isActionMfaRequired("privacy.anonymizePii")).toBe(true);
    expect(isActionMfaRequired("privacy.legalHold")).toBe(true);
    expect(isActionMfaRequired("privacy.export")).toBe(true);
    expect(isActionMfaRequired("billing.manage")).toBe(true);
    expect(isActionMfaRequired("billing.export")).toBe(true);
    expect(isActionMfaRequired("user.roleUpdate")).toBe(true);
    expect(isActionMfaRequired("settings.security")).toBe(true);
    expect(isActionMfaRequired("trade.approveIntroduction")).toBe(true);
    expect(isActionMfaRequired("notification.sendBulk")).toBe(true);
  });

  it("returns false for non-MFA actions", async () => {
    const { isActionMfaRequired } = await import("../index");
    expect(isActionMfaRequired("lead.read")).toBe(false);
    expect(isActionMfaRequired("quotation.draft")).toBe(false);
  });
});

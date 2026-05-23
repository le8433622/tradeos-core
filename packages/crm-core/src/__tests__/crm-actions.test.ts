import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuditCreate,
  mockCompanyCreate,
  mockMembershipFindUnique,
  mockTaskCreate,
  mockNotificationCreate,
  mockLeadCreate,
  mockContactCreate,
  mockCompanyFindUnique,
  mockCompanyUpdate,
  mockContactFindUnique,
  mockContactUpdate,
  mockOrganizationFindUnique,
  mockOrganizationUpdate,
  mockInvitationCreate,
  mockRoleFindUnique,
  mockUserFindMany,
  mockOrganizationMemberFindMany,
  mockContactUpdateMany,
  mockLeadUpdateMany,
  mockConversationUpdateMany,
  mockMessageUpdateMany,
  mockQuotationUpdateMany,
  mockApprovalRequestUpdateMany,
  mockWebhookEventUpdateMany,
  mockIntroductionRequestUpdateMany,
  mockUserUpdate,
  mockCompanyUpdateMany,
  mockTaskUpdateMany,
  tx,
} = vi.hoisted(() => {
  const mockAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  const mockCompanyCreate = vi.fn();
  const mockMembershipFindUnique = vi.fn();
  const mockTaskCreate = vi.fn();
  const mockNotificationCreate = vi.fn();
  const mockLeadCreate = vi.fn();
  const mockContactCreate = vi.fn();
  const mockCompanyFindUnique = vi.fn();
  const mockCompanyUpdate = vi.fn();
  const mockCompanyUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockContactFindUnique = vi.fn();
  const mockContactUpdate = vi.fn();
  const mockOrganizationFindUnique = vi.fn();
  const mockOrganizationUpdate = vi.fn();
  const mockInvitationCreate = vi.fn();
  const mockRoleFindUnique = vi.fn();
  const mockUserFindMany = vi.fn();
  const mockOrganizationMemberFindMany = vi.fn();
  const mockContactUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockLeadUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockConversationUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockMessageUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockQuotationUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockApprovalRequestUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockWebhookEventUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockIntroductionRequestUpdateMany = vi
    .fn()
    .mockResolvedValue({ count: 0 });
  const mockUserUpdate = vi.fn();
  const mockTaskUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const tx = {
    auditLog: { create: mockAuditCreate },
    company: {
      create: mockCompanyCreate,
      findUnique: mockCompanyFindUnique,
      update: mockCompanyUpdate,
      updateMany: mockCompanyUpdateMany,
    },
    contact: {
      create: mockContactCreate,
      findUnique: mockContactFindUnique,
      update: mockContactUpdate,
      updateMany: mockContactUpdateMany,
    },
    lead: {
      create: mockLeadCreate,
      findUnique: vi.fn(),
      updateMany: mockLeadUpdateMany,
    },
    task: { create: mockTaskCreate, updateMany: mockTaskUpdateMany },
    user: { findMany: mockUserFindMany, update: mockUserUpdate },
    organizationMember: {
      findMany: mockOrganizationMemberFindMany,
      findUnique: mockMembershipFindUnique,
    },
    organization: {
      findUnique: mockOrganizationFindUnique,
      update: mockOrganizationUpdate,
    },
    notification: { create: mockNotificationCreate },
    role: { findUnique: mockRoleFindUnique },
    invitation: { create: mockInvitationCreate },
    conversation: { updateMany: mockConversationUpdateMany },
    message: { updateMany: mockMessageUpdateMany },
    quotation: { updateMany: mockQuotationUpdateMany },
    approvalRequest: { updateMany: mockApprovalRequestUpdateMany },
    webhookEvent: { updateMany: mockWebhookEventUpdateMany },
    introductionRequest: { updateMany: mockIntroductionRequestUpdateMany },
  };
  return {
    mockAuditCreate,
    mockCompanyCreate,
    mockMembershipFindUnique,
    mockTaskCreate,
    mockNotificationCreate,
    mockLeadCreate,
    mockContactCreate,
    mockCompanyFindUnique,
    mockCompanyUpdate,
    mockCompanyUpdateMany,
    mockContactFindUnique,
    mockContactUpdate,
    mockOrganizationFindUnique,
    mockOrganizationUpdate,
    mockInvitationCreate,
    mockRoleFindUnique,
    mockUserFindMany,
    mockOrganizationMemberFindMany,
    mockContactUpdateMany,
    mockLeadUpdateMany,
    mockConversationUpdateMany,
    mockMessageUpdateMany,
    mockQuotationUpdateMany,
    mockApprovalRequestUpdateMany,
    mockWebhookEventUpdateMany,
    mockIntroductionRequestUpdateMany,
    mockUserUpdate,
    mockTaskUpdateMany,
    tx,
  };
});

vi.mock("@tradeos/database", () => ({
  prisma: {
    ...tx,
    $transaction: vi.fn((cb: (client: unknown) => unknown) => cb(tx)),
  },
  Prisma: { JsonNull: null },
}));

import { executeAction, getAction } from "@tradeos/policy-core";
import "../index";

const context = {
  actorUserId: "user-1",
  organizationId: "org-1",
  role: "ADMIN" as const,
  source: "manual" as const,
  mfaLevel: "aal2",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditCreate.mockResolvedValue({ id: "audit-1" });
});

describe("crm-core registered actions", () => {
  it("creates companies through policy-core audit transaction", async () => {
    mockCompanyCreate.mockResolvedValue({
      id: "company-1",
      organizationId: "org-1",
    });

    const result = await executeAction(
      "crm.createCompany",
      {
        organizationId: "org-1",
        name: "Acme Exporter",
        type: "SELLER",
      },
      context,
    );

    expect(result).toEqual({ id: "company-1", organizationId: "org-1" });
    expect(mockCompanyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        name: "Acme Exporter",
        type: "SELLER",
      }),
    });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "crm.createCompany",
          approved: true,
        }),
      }),
    );
  });

  it("validates task assignee via active organization membership", async () => {
    mockMembershipFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "crm.createFollowUpTask",
        {
          organizationId: "org-1",
          assigneeId: "user-2",
          title: "Follow up",
        },
        context,
      ),
    ).rejects.toThrow("USER_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("registers notification.sendBulk and requires AAL2 MFA", async () => {
    expect(getAction("notification.sendBulk")).toBeDefined();

    await expect(
      executeAction(
        "notification.sendBulk",
        {
          organizationId: "org-1",
          title: "Member update",
          body: "New opportunity available",
        },
        { ...context, mfaLevel: "aal1" },
      ),
    ).rejects.toThrow("MFA_REQUIRED");

    mockNotificationCreate.mockResolvedValue({
      id: "notification-1",
      status: "published",
    });
    const result = await executeAction(
      "notification.sendBulk",
      {
        organizationId: "org-1",
        title: "Member update",
        body: "New opportunity available",
      },
      context,
    );

    expect(result).toEqual({ id: "notification-1", status: "published" });
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        status: "published",
      }),
    });
  });

  it("creates lead through executeAction", async () => {
    mockLeadCreate.mockResolvedValue({
      id: "lead-1",
      organizationId: "org-1",
      source: "EMAIL",
      name: "John Buyer",
    });

    const result = await executeAction(
      "crm.createLead",
      {
        organizationId: "org-1",
        source: "EMAIL",
        name: "John Buyer",
        email: "john@buyer.com",
        need: "Looking for rice",
      },
      context,
    );

    expect(mockLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        source: "EMAIL",
        name: "John Buyer",
        need: "Looking for rice",
      }),
    });
    expect((result as Record<string, unknown>).id).toBe("lead-1");
  });

  it("creates contact linked to a company with org validation", async () => {
    mockCompanyFindUnique.mockResolvedValue({
      id: "company-1",
      organizationId: "org-1",
    });
    mockContactCreate.mockResolvedValue({
      id: "contact-1",
      organizationId: "org-1",
      companyId: "company-1",
      name: "Alice",
    });

    const result = await executeAction(
      "crm.createContact",
      {
        organizationId: "org-1",
        companyId: "company-1",
        name: "Alice",
        email: "alice@company.com",
      },
      context,
    );

    expect(mockCompanyFindUnique).toHaveBeenCalledWith({
      where: { id: "company-1" },
    });
    expect(mockContactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        companyId: "company-1",
        name: "Alice",
      }),
    });
    expect((result as Record<string, unknown>).id).toBe("contact-1");
  });

  it("rejects contact creation when company belongs to another org", async () => {
    mockCompanyFindUnique.mockResolvedValue({
      id: "company-foreign",
      organizationId: "org-2",
    });

    await expect(
      executeAction(
        "crm.createContact",
        {
          organizationId: "org-1",
          companyId: "company-foreign",
          name: "Eve",
        },
        context,
      ),
    ).rejects.toThrow("COMPANY_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("updates company record owned by the tenant", async () => {
    mockCompanyFindUnique.mockResolvedValue({
      id: "company-1",
      organizationId: "org-1",
    });
    mockCompanyUpdate.mockResolvedValue({
      id: "company-1",
      organizationId: "org-1",
      name: "Updated Co",
      country: "Vietnam",
    });

    const result = await executeAction(
      "crm.updateCompany",
      {
        organizationId: "org-1",
        companyId: "company-1",
        name: "Updated Co",
        country: "Vietnam",
      },
      context,
    );

    expect(mockCompanyUpdate).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: expect.objectContaining({ name: "Updated Co", country: "Vietnam" }),
    });
    expect((result as Record<string, unknown>).name).toBe("Updated Co");
  });

  it("rejects update when company belongs to another org", async () => {
    mockCompanyFindUnique.mockResolvedValue({
      id: "company-foreign",
      organizationId: "org-2",
    });

    await expect(
      executeAction(
        "crm.updateCompany",
        {
          organizationId: "org-1",
          companyId: "company-foreign",
          name: "Hijacked",
        },
        context,
      ),
    ).rejects.toThrow("COMPANY_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockCompanyUpdate).not.toHaveBeenCalled();
  });

  it("updates contact record with org and company validation", async () => {
    mockContactFindUnique.mockResolvedValue({
      id: "contact-1",
      organizationId: "org-1",
      company: { organizationId: "org-1" },
    });
    mockContactUpdate.mockResolvedValue({
      id: "contact-1",
      organizationId: "org-1",
      name: "Alice Updated",
      email: "alice@new.com",
    });

    const result = await executeAction(
      "crm.updateContact",
      {
        organizationId: "org-1",
        contactId: "contact-1",
        name: "Alice Updated",
        email: "alice@new.com",
      },
      context,
    );

    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      data: expect.objectContaining({
        name: "Alice Updated",
        email: "alice@new.com",
      }),
    });
    expect((result as Record<string, unknown>).name).toBe("Alice Updated");
  });

  it("rejects update when contact belongs to another org", async () => {
    mockContactFindUnique.mockResolvedValue({
      id: "contact-foreign",
      organizationId: "org-2",
      company: null,
    });

    await expect(
      executeAction(
        "crm.updateContact",
        {
          organizationId: "org-1",
          contactId: "contact-foreign",
          name: "Hijacked",
        },
        context,
      ),
    ).rejects.toThrow("CONTACT_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockContactUpdate).not.toHaveBeenCalled();
  });

  it("rejects update when contact not found", async () => {
    mockContactFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "crm.updateContact",
        {
          organizationId: "org-1",
          contactId: "contact-missing",
          name: "Ghost",
        },
        context,
      ),
    ).rejects.toThrow("CONTACT_NOT_FOUND");
  });

  it("creates invitation token through user.invite", async () => {
    mockInvitationCreate.mockResolvedValue({ id: "invite-1" });

    const result = await executeAction(
      "user.invite",
      {
        organizationId: "org-1",
        email: "newuser@example.com",
      },
      context,
    );

    expect(mockInvitationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        email: "newuser@example.com",
      }),
      select: { id: true },
    });
    expect((result as Record<string, unknown>).invitationId).toBe("invite-1");
    expect((result as Record<string, unknown>).token).toBeDefined();
    expect(typeof (result as Record<string, unknown>).token).toBe("string");
  });

  it("rejects invitation with invalid email", async () => {
    await expect(
      executeAction(
        "user.invite",
        {
          organizationId: "org-1",
          email: "",
        },
        context,
      ),
    ).rejects.toThrow("INVALID_REQUEST_BODY");

    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it("rejects invitation with invalid role ID", async () => {
    mockRoleFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "user.invite",
        {
          organizationId: "org-1",
          email: "user@test.com",
          roleId: "invalid-role",
        },
        context,
      ),
    ).rejects.toThrow("INVALID_ROLE");
  });

  it("rejects invitation with a role from another organization", async () => {
    mockRoleFindUnique.mockResolvedValue({
      id: "role-foreign",
      isSystem: false,
      organizationId: "org-2",
    });

    await expect(
      executeAction(
        "user.invite",
        {
          organizationId: "org-1",
          email: "user@test.com",
          roleId: "role-foreign",
        },
        context,
      ),
    ).rejects.toThrow("INVALID_ROLE");

    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it("updates billing plan as OWNER", async () => {
    mockOrganizationUpdate.mockResolvedValue({ plan: "TEAM" });

    const result = await executeAction(
      "billing.planUpdate",
      {
        organizationId: "org-1",
        plan: "TEAM",
      },
      { ...context, role: "OWNER" },
    );

    expect(mockOrganizationUpdate).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { plan: "TEAM" },
      select: { plan: true },
    });
    expect((result as Record<string, unknown>).plan).toBe("TEAM");
  });

  it("rejects billing plan update with invalid plan", async () => {
    await expect(
      executeAction(
        "billing.planUpdate",
        {
          organizationId: "org-1",
          plan: "INVALID_PLAN",
        },
        { ...context, role: "OWNER" },
      ),
    ).rejects.toThrow("INVALID_REQUEST_BODY");
  });

  it("toggles MFA requirement as OWNER", async () => {
    mockOrganizationUpdate.mockResolvedValue({ mfaRequired: true });

    const result = await executeAction(
      "settings.security",
      {
        organizationId: "org-1",
        mfaRequired: true,
      },
      { ...context, role: "OWNER" },
    );

    expect(mockOrganizationUpdate).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { mfaRequired: true },
      select: { mfaRequired: true },
    });
    expect((result as Record<string, unknown>).mfaRequired).toBe(true);
  });

  it("rejects settings.security by non-OWNER role", async () => {
    await expect(
      executeAction(
        "settings.security",
        {
          organizationId: "org-1",
          mfaRequired: true,
        },
        context,
      ),
    ).rejects.toThrow("Action blocked");
  });

  it("anonymizes PII fields for a tenant", async () => {
    mockOrganizationFindUnique.mockResolvedValue({
      id: "org-1",
      legalHold: false,
    });
    mockUserFindMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
    mockOrganizationMemberFindMany
      .mockResolvedValueOnce([{ userId: "user-1", organizationId: "org-1" }])
      .mockResolvedValueOnce([{ userId: "user-1", organizationId: "org-1" }]);
    mockContactUpdateMany.mockResolvedValue({ count: 3 });
    mockLeadUpdateMany.mockResolvedValue({ count: 5 });
    mockUserUpdate.mockResolvedValue({});

    const result = await executeAction(
      "privacy.anonymizePii",
      {
        organizationId: "org-1",
      },
      { ...context, role: "OWNER" },
    );

    expect((result as Record<string, unknown>).anonymizedUsers).toBe(2);
    expect((result as Record<string, unknown>).anonymizedContacts).toBe(3);
    expect((result as Record<string, unknown>).anonymizedLeads).toBe(5);
    expect(
      (result as Record<string, unknown>).anonymizedRecords,
    ).toBeGreaterThan(0);
    expect(mockContactUpdateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      data: expect.objectContaining({ name: null, email: null, phone: null }),
    });
  });

  it("rejects anonymize PII when legal hold is active", async () => {
    mockOrganizationFindUnique.mockResolvedValue({
      id: "org-1",
      legalHold: true,
    });

    await expect(
      executeAction(
        "privacy.anonymizePii",
        {
          organizationId: "org-1",
        },
        { ...context, role: "OWNER" },
      ),
    ).rejects.toThrow("LEGAL_HOLD_ACTIVE");
  });

  it("rejects anonymize PII when organization not found", async () => {
    mockOrganizationFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "privacy.anonymizePii",
        {
          organizationId: "org-missing",
        },
        { ...context, organizationId: "org-missing", role: "OWNER" },
      ),
    ).rejects.toThrow("ORGANIZATION_NOT_FOUND");
  });
});

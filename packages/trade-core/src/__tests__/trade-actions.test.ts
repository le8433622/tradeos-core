import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuditCreate,
  mockProductFindMany,
  mockQuotationCreate,
  mockIntroductionFindUnique,
  mockIntroductionUpdate,
  mockQuotationFindUnique,
  mockQuotationUpdate,
  mockProductCreate,
  mockProductFindUnique,
  mockProductUpdate,
  mockCompanyFindMany,
  mockOrganizationFindUnique,
  mockIntroductionCreate,
  tx,
} = vi.hoisted(() => {
  const mockAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  const mockProductFindMany = vi.fn();
  const mockQuotationCreate = vi.fn();
  const mockIntroductionFindUnique = vi.fn();
  const mockIntroductionUpdate = vi.fn();
  const mockQuotationFindUnique = vi.fn();
  const mockQuotationUpdate = vi.fn();
  const mockProductCreate = vi.fn();
  const mockProductFindUnique = vi.fn();
  const mockProductUpdate = vi.fn();
  const mockCompanyFindMany = vi.fn();
  const mockOrganizationFindUnique = vi.fn();
  const mockIntroductionCreate = vi.fn();
  const tx = {
    auditLog: { create: mockAuditCreate },
    lead: { findUnique: vi.fn() },
    product: {
      findMany: mockProductFindMany,
      findUnique: mockProductFindUnique,
      create: mockProductCreate,
      update: mockProductUpdate,
    },
    quotation: {
      create: mockQuotationCreate,
      findUnique: mockQuotationFindUnique,
      update: mockQuotationUpdate,
    },
    company: { findMany: mockCompanyFindMany },
    organization: { findUnique: mockOrganizationFindUnique },
    introductionRequest: {
      findUnique: mockIntroductionFindUnique,
      update: mockIntroductionUpdate,
      create: mockIntroductionCreate,
    },
    contact: { findUnique: vi.fn() },
  };
  return {
    mockAuditCreate,
    mockProductFindMany,
    mockQuotationCreate,
    mockIntroductionFindUnique,
    mockIntroductionUpdate,
    mockQuotationFindUnique,
    mockQuotationUpdate,
    mockProductCreate,
    mockProductFindUnique,
    mockProductUpdate,
    mockCompanyFindMany,
    mockOrganizationFindUnique,
    mockIntroductionCreate,
    tx,
  };
});

vi.mock("@tradeos/database", () => ({
  prisma: {
    ...tx,
    $transaction: vi.fn((cb: (client: unknown) => unknown) => cb(tx)),
  },
}));

import { executeAction } from "@tradeos/policy-core";
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

describe("trade-core registered actions", () => {
  it("creates quotation line items and computes total from items", async () => {
    mockQuotationCreate.mockResolvedValue({
      id: "quote-1",
      organizationId: "org-1",
      totalAmount: 250,
      lineItems: [
        { description: "Rice", quantity: 2, unitPrice: 100 },
        { description: "Inspection", quantity: 1, unitPrice: 50 },
      ],
    });

    const result = await executeAction(
      "trade.draftQuotation",
      {
        organizationId: "org-1",
        title: "Rice quote",
        requirements: "Quote with line items",
        currency: "USD",
        estimatedAmount: 999,
        items: [
          {
            description: "Rice",
            quantity: 2,
            unitPrice: 100,
          },
          {
            description: "Inspection",
            quantity: 1,
            unitPrice: 50,
          },
        ],
      },
      context,
    );

    expect(mockQuotationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        totalAmount: 250,
        lineItems: {
          create: [
            expect.objectContaining({
              description: "Rice",
              quantity: 2,
              unitPrice: 100,
              totalAmount: 200,
            }),
            expect.objectContaining({
              description: "Inspection",
              quantity: 1,
              unitPrice: 50,
              totalAmount: 50,
            }),
          ],
        },
      }),
      include: { lineItems: true },
    });
    expect((result as { totalAmount: number }).totalAmount).toBe(250);
  });

  it("rejects quotation line items that reference products outside the tenant", async () => {
    mockProductFindMany.mockResolvedValue([]);

    await expect(
      executeAction(
        "trade.draftQuotation",
        {
          organizationId: "org-1",
          title: "Rice quote",
          requirements: "Quote 10 tons",
          items: [
            {
              productId: "product-foreign",
              description: "Rice",
              quantity: 10,
              unitPrice: 100,
            },
          ],
        },
        context,
      ),
    ).rejects.toThrow("PRODUCT_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockQuotationCreate).not.toHaveBeenCalled();
  });

  it("blocks introduction approval by a non-participant organization", async () => {
    mockIntroductionFindUnique.mockResolvedValue({
      id: "intro-1",
      buyerOrgId: "org-2",
      sellerOrgId: "org-3",
      status: "PENDING_BUYER_APPROVAL",
    });

    await expect(
      executeAction(
        "trade.approveIntroduction",
        {
          organizationId: "org-1",
          introductionId: "intro-1",
        },
        context,
      ),
    ).rejects.toThrow("ORGANIZATION_ACCESS_DENIED");

    expect(mockIntroductionUpdate).not.toHaveBeenCalled();
  });

  it("allows a buyer or seller to report approved introduction value", async () => {
    mockIntroductionFindUnique.mockResolvedValue({
      id: "intro-1",
      buyerOrgId: "org-1",
      sellerOrgId: "org-2",
      status: "APPROVED",
    });
    mockIntroductionUpdate.mockResolvedValue({
      id: "intro-1",
      valueGenerated: "10000 USD",
    });

    const result = await executeAction(
      "trade.reportIntroductionValue",
      {
        organizationId: "org-1",
        introductionId: "intro-1",
        valueGenerated: "10000 USD",
      },
      { ...context, role: "OPERATOR" },
    );

    expect(result).toEqual({ id: "intro-1", valueGenerated: "10000 USD" });
    expect(mockIntroductionUpdate).toHaveBeenCalledWith({
      where: { id: "intro-1" },
      data: { valueGenerated: "10000 USD" },
    });
  });

  it("sends quotation through executeAction, org ownership verified", async () => {
    mockQuotationFindUnique.mockResolvedValue({
      id: "q-1",
      organizationId: "org-1",
    });
    mockQuotationUpdate.mockResolvedValue({
      id: "q-1",
      organizationId: "org-1",
      status: "SENT",
    });

    const result = await executeAction(
      "trade.sendQuotation",
      { quotationId: "q-1" },
      context,
    );

    expect(mockQuotationUpdate).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: { status: "SENT" },
    });
    expect((result as { status: string }).status).toBe("SENT");
  });

  it("rejects send quotation when quotation not found", async () => {
    mockQuotationFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "trade.sendQuotation",
        { quotationId: "q-missing" },
        context,
      ),
    ).rejects.toThrow("QUOTATION_NOT_FOUND");

    expect(mockQuotationUpdate).not.toHaveBeenCalled();
  });

  it("rejects send quotation when quotation belongs to another org", async () => {
    mockQuotationFindUnique.mockResolvedValue({
      id: "q-foreign",
      organizationId: "org-2",
    });

    await expect(
      executeAction(
        "trade.sendQuotation",
        { quotationId: "q-foreign" },
        context,
      ),
    ).rejects.toThrow("QUOTATION_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockQuotationUpdate).not.toHaveBeenCalled();
  });

  it("proposes introduction between two opted-in tenants", async () => {
    mockOrganizationFindUnique.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.id === "buyer-org")
        return { id: "buyer-org", introductionsEnabled: true };
      if (where.id === "seller-org")
        return { id: "seller-org", introductionsEnabled: true };
      return null;
    });
    mockIntroductionCreate.mockResolvedValue({
      id: "intro-new",
      proposerOrgId: "org-1",
      buyerOrgId: "buyer-org",
      sellerOrgId: "seller-org",
    });

    const result = await executeAction(
      "trade.proposeIntroduction",
      {
        organizationId: "org-1",
        buyerOrgId: "buyer-org",
        sellerOrgId: "seller-org",
        buyerNote: "Interested in rice",
        sellerNote: "Verified exporter",
      },
      context,
    );

    expect(mockIntroductionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        proposerOrgId: "org-1",
        buyerOrgId: "buyer-org",
        sellerOrgId: "seller-org",
        buyerNote: "Interested in rice",
        sellerNote: "Verified exporter",
      }),
    });
    expect((result as { id: string }).id).toBe("intro-new");
  });

  it("rejects introduction when buyer org not opted in", async () => {
    mockOrganizationFindUnique.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.id === "buyer-org")
        return { id: "buyer-org", introductionsEnabled: false };
      if (where.id === "seller-org")
        return { id: "seller-org", introductionsEnabled: true };
      return null;
    });

    await expect(
      executeAction(
        "trade.proposeIntroduction",
        {
          organizationId: "org-1",
          buyerOrgId: "buyer-org",
          sellerOrgId: "seller-org",
        },
        context,
      ),
    ).rejects.toThrow("BUYER_ORG_NOT_OPTED_IN");

    expect(mockIntroductionCreate).not.toHaveBeenCalled();
  });

  it("rejects introduction when seller org not found", async () => {
    mockOrganizationFindUnique.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.id === "buyer-org")
        return { id: "buyer-org", introductionsEnabled: true };
      return null;
    });

    await expect(
      executeAction(
        "trade.proposeIntroduction",
        {
          organizationId: "org-1",
          buyerOrgId: "buyer-org",
          sellerOrgId: "seller-missing",
        },
        context,
      ),
    ).rejects.toThrow("ORGANIZATION_NOT_FOUND");
  });

  it("rejects introduction request by non-participant organization", async () => {
    mockIntroductionFindUnique.mockResolvedValue({
      id: "intro-reject",
      buyerOrgId: "org-2",
      sellerOrgId: "org-3",
      status: "PENDING_BUYER_APPROVAL",
    });

    await expect(
      executeAction(
        "trade.rejectIntroduction",
        {
          organizationId: "org-1",
          introductionId: "intro-reject",
        },
        context,
      ),
    ).rejects.toThrow("ORGANIZATION_ACCESS_DENIED");
  });

  it("rejects introduction when request not found", async () => {
    mockIntroductionFindUnique.mockResolvedValue(null);

    await expect(
      executeAction(
        "trade.rejectIntroduction",
        {
          organizationId: "org-1",
          introductionId: "intro-missing",
        },
        context,
      ),
    ).rejects.toThrow("INTRODUCTION_REQUEST_NOT_FOUND");
  });

  it("creates a product in the tenant catalog", async () => {
    mockProductCreate.mockResolvedValue({
      id: "prod-1",
      organizationId: "org-1",
      name: "Premium Rice",
    });

    const result = await executeAction(
      "trade.createProduct",
      {
        organizationId: "org-1",
        name: "Premium Rice",
        category: "agriculture",
        originCountry: "Vietnam",
        priceRange: "500-800 USD/ton",
      },
      context,
    );

    expect(mockProductCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        name: "Premium Rice",
        category: "agriculture",
        originCountry: "Vietnam",
      }),
    });
    expect((result as { id: string }).id).toBe("prod-1");
  });

  it("rejects update when product belongs to another org", async () => {
    mockProductFindUnique.mockResolvedValue({
      id: "prod-foreign",
      organizationId: "org-2",
    });

    await expect(
      executeAction(
        "trade.updateProduct",
        {
          organizationId: "org-1",
          productId: "prod-foreign",
          name: "Hijacked Product",
        },
        context,
      ),
    ).rejects.toThrow("PRODUCT_BELONGS_TO_ANOTHER_ORGANIZATION");

    expect(mockProductUpdate).not.toHaveBeenCalled();
  });

  it("updates a product owned by the tenant", async () => {
    mockProductFindUnique.mockResolvedValue({
      id: "prod-1",
      organizationId: "org-1",
    });
    mockProductUpdate.mockResolvedValue({
      id: "prod-1",
      organizationId: "org-1",
      name: "Updated Rice",
      priceRange: "600-900 USD/ton",
    });

    const result = await executeAction(
      "trade.updateProduct",
      {
        organizationId: "org-1",
        productId: "prod-1",
        name: "Updated Rice",
        priceRange: "600-900 USD/ton",
      },
      context,
    );

    expect(mockProductUpdate).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: expect.objectContaining({
        name: "Updated Rice",
        priceRange: "600-900 USD/ton",
      }),
    });
    expect((result as { name: string }).name).toBe("Updated Rice");
  });

  it("suggests partners filtered by organization and category", async () => {
    mockCompanyFindMany.mockResolvedValue([
      { id: "company-1", name: "Exporter Co", country: "Vietnam" },
    ]);

    const result = await executeAction(
      "trade.suggestPartner",
      {
        organizationId: "org-1",
        need: "Looking for rice suppliers",
        country: "Vietnam",
        category: "agriculture",
      },
      context,
    );

    expect(mockCompanyFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        country: "Vietnam",
      }),
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    expect((result as { suggestions: unknown[] }).suggestions).toHaveLength(1);
  });

  it("returns empty suggestions when no partners match", async () => {
    mockCompanyFindMany.mockResolvedValue([]);

    const result = await executeAction(
      "trade.suggestPartner",
      {
        organizationId: "org-1",
        need: "Looking for steel",
        category: "steel",
      },
      context,
    );

    expect((result as { suggestions: unknown[] }).suggestions).toHaveLength(0);
  });
});

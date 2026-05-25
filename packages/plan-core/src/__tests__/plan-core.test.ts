import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockOrgFindUnique, mockMemberCount, mockSourcingCount, mockCheckpointCount, mockPlanLimitFindUnique } =
  vi.hoisted(() => ({
    mockOrgFindUnique: vi.fn(),
    mockMemberCount: vi.fn(),
    mockConversationCount: vi.fn(),
    mockIntegrationCount: vi.fn(),
    mockSourcingCount: vi.fn(),
    mockCheckpointCount: vi.fn(),
    mockPlanLimitFindUnique: vi.fn(),
  }));

vi.mock("@tradeos/database", () => ({
  prisma: {
    organization: { findUnique: mockOrgFindUnique },
    organizationMember: { count: mockMemberCount },
    conversation: { count: vi.fn() },
    webhookIntegration: { count: vi.fn() },
    sourcingRun: { count: mockSourcingCount },
    workCheckpoint: { count: mockCheckpointCount },
    planLimit: { findUnique: mockPlanLimitFindUnique, findMany: vi.fn() },
  },
  Prisma: { JsonNull: null },
}));

import { checkEntitlement, FEATURE_LIMITS } from "../index";

beforeEach(() => {
  vi.clearAllMocks();
  mockPlanLimitFindUnique.mockResolvedValue(null);
});

describe("checkEntitlement", () => {
  it("allows when current usage is below limit", async () => {
    mockOrgFindUnique.mockResolvedValue({ plan: "TEAM" });
    mockMemberCount.mockResolvedValue(5);
    const result = await checkEntitlement("org-1", "seats");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(20);
    expect(result.current).toBe(5);
  });

  it("blocks when current usage equals limit", async () => {
    mockOrgFindUnique.mockResolvedValue({ plan: "FREE" });
    mockMemberCount.mockResolvedValue(2);
    const result = await checkEntitlement("org-1", "seats");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(2);
    expect(result.current).toBe(2);
  });

  it("blocks when current usage exceeds limit", async () => {
    mockOrgFindUnique.mockResolvedValue({ plan: "FREE" });
    mockSourcingCount.mockResolvedValue(5);
    const result = await checkEntitlement("org-1", "sourcing_runs");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(3);
    expect(result.current).toBe(5);
  });

  it("allows all for ENTERPRISE plan (unlimited)", async () => {
    mockOrgFindUnique.mockResolvedValue({ plan: "ENTERPRISE" });
    mockSourcingCount.mockResolvedValue(999);
    const result = await checkEntitlement("org-1", "sourcing_runs");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.current).toBe(0);
  });

  it("throws when organization not found", async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    await expect(checkEntitlement("org-missing", "seats")).rejects.toThrow(
      "ORGANIZATION_NOT_FOUND",
    );
  });

  it("uses DB PlanLimit when present (override)", async () => {
    mockOrgFindUnique.mockResolvedValue({ plan: "TEAM" });
    mockPlanLimitFindUnique.mockResolvedValue({ limitValue: 50 });
    mockMemberCount.mockResolvedValue(25);
    const result = await checkEntitlement("org-1", "seats");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(50);
    expect(result.current).toBe(25);
  });
});

describe("FEATURE_LIMITS", () => {
  it("defines limits for all plan tiers", () => {
    const plans = ["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"];
    const features = [
      "seats",
      "inbound_messages",
      "ai_monthly_budget",
      "integrations",
      "sourcing_runs",
      "checkpoints",
    ];
    for (const plan of plans) {
      for (const feature of features) {
        expect(FEATURE_LIMITS[plan]).toHaveProperty(feature);
      }
    }
  });

  it("has increasing limits for higher tiers", () => {
    expect(FEATURE_LIMITS.PILOT.seats).toBeGreaterThan(
      FEATURE_LIMITS.FREE.seats!,
    );
    expect(FEATURE_LIMITS.TEAM.seats).toBeGreaterThan(
      FEATURE_LIMITS.PILOT.seats!,
    );
  });
});
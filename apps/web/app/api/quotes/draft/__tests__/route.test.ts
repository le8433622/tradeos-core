import { describe, expect, it, vi, beforeEach } from "vitest";

const mockExecuteAction = vi.fn();
vi.mock("@tradeos/policy-core", () => ({
  executeAction: mockExecuteAction,
}));
vi.mock("@tradeos/quote-core", () => ({}));

const mockWithApiSession = vi.fn();
vi.mock("../../../../../lib/api-errors", () => ({
  withApiSession: mockWithApiSession,
  apiErrorResponse: vi.fn(
    (_req: unknown, _err: unknown) =>
      new Response(JSON.stringify({ error: String(_err) }), {
        status: 500,
      }),
  ),
}));

const { POST } = await import("../route");

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/quotes/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSession(overrides: Record<string, unknown> = {}) {
  mockWithApiSession.mockResolvedValue({
    session: {
      userId: "user-1",
      organizationId: "org-1",
      role: "OWNER",
      permissions: [],
      email: "admin@test.com",
      ...overrides,
    },
  });
}

describe("POST /api/quotes/draft", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks unauthenticated requests", async () => {
    mockWithApiSession.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "AUTH_REQUIRED" }), {
        status: 401,
      }),
    });

    const response = await POST(
      makeRequest({
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("requires title, supplierName, buyPrice", async () => {
    mockSession();

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("title, supplierName, and buyPrice are required");
  });

  it("drafts a quote successfully", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({
      id: "quote-1",
      warnings: [],
    });

    const response = await POST(
      makeRequest({
        title: "Robot CNC welding quote",
        supplierName: "TechNova Viet Nam",
        buyPrice: 85_000_000,
        currency: "VND",
        quantity: 12,
        shippingCost: 5_000_000,
        targetMarginPercent: 15,
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.id).toBe("quote-1");
    expect(body.warnings).toEqual([]);

    const callInput = mockExecuteAction.mock.calls[0][1];
    expect(callInput.title).toBe("Robot CNC welding quote");
    expect(callInput.supplierName).toBe("TechNova Viet Nam");
    expect(callInput.buyPrice).toBe(85_000_000);
    expect(callInput.currency).toBe("VND");
  });

  it("defaults currency to USD when not provided", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "quote-1", warnings: [] });

    await POST(
      makeRequest({
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
      }),
    );

    expect(mockExecuteAction.mock.calls[0][1].currency).toBe("USD");
  });

  it("passes sourcingRunId when provided", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "quote-1", warnings: [] });

    await POST(
      makeRequest({
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
        sourcingRunId: "run-1",
      }),
    );

    expect(mockExecuteAction.mock.calls[0][1].sourcingRunId).toBe("run-1");
  });

  it("accepts OWNER and ADMIN roles", async () => {
    for (const role of ["OWNER", "ADMIN"]) {
      mockSession({ role });
      mockExecuteAction.mockResolvedValue({ id: "q", warnings: [] });

      const response = await POST(
        makeRequest({
          title: "Test",
          supplierName: "Test Supplier",
          buyPrice: 1000,
        }),
      );
      expect(response.status).toBe(200);
    }
  });
});

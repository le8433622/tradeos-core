import { describe, expect, it, vi, beforeEach } from "vitest";

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
  return new Request("http://localhost/api/product-data/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSession(overrides: Record<string, unknown> = {}) {
  mockWithApiSession.mockResolvedValue({
    session: {
      userId: "test-user",
      organizationId: "test-org",
      role: "OWNER",
      permissions: [],
      email: "test@test.com",
      ...overrides,
    },
  });
}

describe("POST /api/product-data/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EBAY_OAUTH_TOKEN;
    delete process.env.EBAY_SANDBOX;
  });

  it("blocks unauthenticated requests", async () => {
    mockWithApiSession.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "AUTH_REQUIRED" }), {
        status: 401,
      }),
    });

    const response = await POST(makeRequest({ text: "welding robot" }));
    expect(response.status).toBe(401);
  });

  it("blocks unauthorized roles", async () => {
    mockWithApiSession.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "ROLE_ACCESS_DENIED" }), {
        status: 403,
      }),
    });

    const response = await POST(makeRequest({ text: "welding robot" }));
    expect(response.status).toBe(403);
  });

  it("requires text field", async () => {
    mockSession();

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("text is required");
  });

  it("returns mock product data when provider=mock", async () => {
    mockSession();

    const response = await POST(
      makeRequest({ text: "welding robot", provider: "mock" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.providerUsed).toBe("mock");
    expect(body.intent).toBeDefined();
    expect(body.intent.query).toContain("welding robot");
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(body.evidence.length).toBeGreaterThan(0);
    expect(body.simulation).toBeDefined();
    expect(body.simulation.recommendations.length).toBeGreaterThan(0);
  });

  it("falls back to mock when no EBAY_OAUTH_TOKEN and provider=auto", async () => {
    mockSession();

    const response = await POST(
      makeRequest({ text: "welding robot", provider: "auto" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.providerUsed).toBe("mock");
    expect(body.warnings).toContain(
      "EBAY_OAUTH_TOKEN not configured. Falling back to mock data.",
    );
  });

  it("selects eBay adapter when provider=ebay even without token", async () => {
    mockSession();

    const response = await POST(
      makeRequest({ text: "welding robot", provider: "ebay" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.providerUsed).toBe("ebay");
    expect(body.warnings[0]).toContain("CONFIG_REQUIRED");
    expect(body.candidates).toEqual([]);
  });

  it("response includes evidence with correct structure", async () => {
    mockSession();

    const response = await POST(
      makeRequest({ text: "welding robot 100 million VND", provider: "mock" }),
    );
    const body = await response.json();

    expect(body.evidence.length).toBeGreaterThan(0);
    const ev = body.evidence[0];
    expect(ev.sourceProvider).toBe("mock");
    expect(ev.productTitle).toBeTruthy();
    expect(ev.evidenceQuality).toBeTruthy();
    expect(Array.isArray(ev.missingProofFlags)).toBe(true);
  });

  it("response includes simulation with recommendations", async () => {
    mockSession();

    const response = await POST(
      makeRequest({
        text: "welding robot 100 million VND urgent",
        provider: "mock",
      }),
    );
    const body = await response.json();

    expect(body.simulation.scenarioTypes).toContain("URGENT_BUYER");
    expect(body.simulation.recommendations.length).toBeGreaterThan(0);
    expect(body.simulation.recommendations[0].recommendation).toBeDefined();
    expect(body.simulation.recommendations[0].score.total).toBeGreaterThan(0);
  });

  it("parses intent from Vietnamese text", async () => {
    mockSession();

    const response = await POST(
      makeRequest({
        text: "Tôi muốn mua robot hàn tự động, ngân sách 100 triệu, mua 12 bộ, gấp",
        provider: "mock",
      }),
    );
    const body = await response.json();

    expect(body.intent.query).toContain("robot hàn tự động");
    expect(body.intent.budgetMax).toBe(100_000_000);
    expect(body.intent.quantity).toBe(12);
    expect(body.intent.urgency).toBe("HIGH");
  });

  it("allows intent override from body", async () => {
    mockSession();

    const response = await POST(
      makeRequest({
        text: "cheap robot",
        provider: "mock",
        intent: { budgetMax: 50_000_000, urgency: "HIGH" },
      }),
    );
    const body = await response.json();

    expect(body.intent.budgetMax).toBe(50_000_000);
    expect(body.intent.urgency).toBe("HIGH");
  });

  it("accepts any role in ALLOWED_ROLES", async () => {
    for (const role of ["OWNER", "ADMIN", "OPERATOR"]) {
      mockSession({ role });

      const response = await POST(
        makeRequest({ text: "welding robot", provider: "mock" }),
      );
      expect(response.status).toBe(200);
    }
  });
});

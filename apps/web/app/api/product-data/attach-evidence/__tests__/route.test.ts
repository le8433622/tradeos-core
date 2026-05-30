import { describe, expect, it, vi, beforeEach } from "vitest";

const mockExecuteAction = vi.fn();
vi.mock("@tradeos/policy-core", () => ({
  executeAction: mockExecuteAction,
}));
vi.mock("@tradeos/evidence-core", () => ({}));
vi.mock("@tradeos/sourcing-core", () => ({}));

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

const SEARCH_RESULT = {
  intent: {
    query: "welding robot",
    budgetMax: 100_000_000,
    quantity: 12,
    urgency: "HIGH",
    currency: "VND",
  },
  candidates: [
    {
      provider: "mock",
      externalId: "cand-1",
      title: "Automatic welding robot with CNC controller",
      price: 85_000_000,
      currency: "VND",
      sellerName: "TechNova Viet Nam",
    },
    {
      provider: "mock",
      externalId: "cand-2",
      title: "Cheap automatic welding robot controller bundle",
      price: 45_000_000,
      currency: "VND",
      sellerName: "MiniRobot Korea",
    },
  ],
  evidence: [
    {
      sourceProvider: "mock",
      productTitle: "Automatic welding robot with CNC controller",
      price: 85_000_000,
      currency: "VND",
      sellerName: "TechNova Viet Nam",
      evidenceQuality: "L3_SELLER_IDENTIFIED",
      missingProofFlags: ["NEEDS_DELIVERY_ESTIMATE", "NEEDS_SHIPPING_COST"],
    },
    {
      sourceProvider: "mock",
      productTitle: "Cheap automatic welding robot controller bundle",
      price: 45_000_000,
      currency: "VND",
      sellerName: "MiniRobot Korea",
      evidenceQuality: "L3_SELLER_IDENTIFIED",
      missingProofFlags: ["NEEDS_SUPPLIER_IDENTITY", "NEEDS_DELIVERY_ESTIMATE"],
    },
  ],
  simulation: {
    scenarioTypes: ["URGENT_BUYER", "FACTORY_PROCUREMENT", "LOW_BUDGET"],
    recommendations: [
      {
        candidate: {
          provider: "mock",
          externalId: "cand-1",
          title: "Automatic welding robot with CNC controller",
        },
        recommendation: "BEST_MATCH",
        score: { total: 84 },
      },
      {
        candidate: {
          provider: "mock",
          externalId: "cand-2",
          title: "Cheap automatic welding robot controller bundle",
        },
        recommendation: "REQUEST_MORE_PROOF",
        score: { total: 52 },
      },
    ],
  },
  providerUsed: "mock",
};

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/product-data/attach-evidence", {
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

describe("POST /api/product-data/attach-evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthenticated requests", async () => {
    mockWithApiSession.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "AUTH_REQUIRED" }), {
        status: 401,
      }),
    });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("blocks unauthorized roles", async () => {
    mockWithApiSession.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "ROLE_ACCESS_DENIED" }), {
        status: 403,
      }),
    });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects missing searchResult", async () => {
    mockSession();

    const response = await POST(makeRequest({ candidateIndex: 0 }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("searchResult is required");
  });

  it("rejects missing candidateIndex", async () => {
    mockSession();

    const response = await POST(makeRequest({ searchResult: SEARCH_RESULT }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("candidateIndex is required");
  });

  it("rejects both sourcingRunId and createNewRun", async () => {
    mockSession();

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
        sourcingRunId: "run-123",
        createNewRun: true,
      }),
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe(
      "Cannot specify both sourcingRunId and createNewRun",
    );
  });

  it("rejects out-of-range candidateIndex", async () => {
    mockSession();

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 99,
      }),
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("candidateIndex out of range");
  });

  it("creates evidence item from search result", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "evt-001" });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.evidenceItemId).toBe("evt-001");
    expect(body.sourcingRunId).toBeNull();

    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
    const callArgs = mockExecuteAction.mock.calls[0];
    expect(callArgs[0]).toBe("evidence.createItem");
    expect(callArgs[1].relatedType).toBe("SOURCING_RUN");
    expect(callArgs[1].evidenceType).toBe("MARKET_BENCHMARK");
    expect(callArgs[1].title).toContain("Automatic welding robot");
    expect(callArgs[1].organizationId).toBe("test-org");
  });

  it("attaches to existing sourcingRunId", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "evt-002" });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
        sourcingRunId: "run-existing",
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.evidenceItemId).toBe("evt-002");
    expect(body.sourcingRunId).toBe("run-existing");

    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteAction.mock.calls[0][1].sourcingRunId).toBe(
      "run-existing",
    );
  });

  it("creates new sourcing run when createNewRun=true", async () => {
    mockSession();
    mockExecuteAction
      .mockResolvedValueOnce({ id: "evt-003" })
      .mockResolvedValueOnce({ id: "run-003", status: "DRAFT" })
      .mockResolvedValueOnce({ id: "evt-003", sourcingRunId: "run-003" });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
        createNewRun: true,
        newRunTitle: "Robot CNC sourcing",
        newRunRequirement: "Need 12 robots urgently",
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.evidenceItemId).toBe("evt-003");
    expect(body.sourcingRunId).toBe("run-003");

    expect(mockExecuteAction).toHaveBeenCalledTimes(3);
    expect(mockExecuteAction.mock.calls[0][0]).toBe("evidence.createItem");
    expect(mockExecuteAction.mock.calls[1][0]).toBe("sourcing.createRun");
    expect(mockExecuteAction.mock.calls[2][0]).toBe("evidence.attachToRun");

    const runInput = mockExecuteAction.mock.calls[1][1];
    expect(runInput.title).toBe("Robot CNC sourcing");
    expect(runInput.requirement).toBe("Need 12 robots urgently");
    expect(runInput.budget).toBe(100_000_000);
    expect(runInput.quantity).toBe(12);
  });

  it("creates evidence with seller name in description", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "evt-004" });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 0,
      }),
    );
    const body = await response.json();
    expect(body.evidenceItemId).toBe("evt-004");

    const callArgs = mockExecuteAction.mock.calls[0][1];
    expect(callArgs.description).toContain("TechNova Viet Nam");
    expect(callArgs.description).toContain("BEST_MATCH");
  });

  it("accepts any role in ALLOWED_ROLES", async () => {
    for (const role of ["OWNER", "ADMIN", "OPERATOR"]) {
      mockSession({ role });
      mockExecuteAction.mockResolvedValue({ id: "evt-role" });

      const response = await POST(
        makeRequest({
          searchResult: SEARCH_RESULT,
          candidateIndex: 0,
        }),
      );
      expect(response.status).toBe(200);
    }
  });

  it("creates evidence for second candidate (index 1)", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "evt-005" });

    const response = await POST(
      makeRequest({
        searchResult: SEARCH_RESULT,
        candidateIndex: 1,
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.evidenceItemId).toBe("evt-005");

    const callArgs = mockExecuteAction.mock.calls[0][1];
    expect(callArgs.title).toContain("Cheap automatic welding robot");
    expect(callArgs.metadata.productSearch.recommendation.recommendation).toBe(
      "REQUEST_MORE_PROOF",
    );
  });
});

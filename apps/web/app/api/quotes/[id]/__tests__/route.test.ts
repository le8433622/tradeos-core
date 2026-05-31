import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockExecuteAction, mockPrismaFindFirst, mockWithApiSession } =
  vi.hoisted(() => ({
    mockExecuteAction: vi.fn(),
    mockPrismaFindFirst: vi.fn(),
    mockWithApiSession: vi.fn(),
  }));

vi.mock("@tradeos/policy-core", () => ({
  executeAction: mockExecuteAction,
}));
vi.mock("@tradeos/quote-core", () => ({}));
vi.mock("@tradeos/database", () => ({
  prisma: { quoteDraft: { findFirst: mockPrismaFindFirst } },
}));
vi.mock("../../../../../lib/api-errors", () => ({
  withApiSession: mockWithApiSession,
  apiErrorResponse: vi.fn(
    (_req: unknown, _err: unknown) =>
      new Response(JSON.stringify({ error: String(_err) }), {
        status: 500,
      }),
  ),
}));

const { GET, PATCH } = await import("../route");

function mockSession() {
  mockWithApiSession.mockResolvedValue({
    session: {
      userId: "user-1",
      organizationId: "org-1",
      role: "OWNER",
      permissions: [],
      email: "admin@test.com",
    },
  });
}

function makeRequest(method: string, body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/quotes/quote-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockParams = { params: Promise.resolve({ id: "quote-1" }) };

describe("GET /api/quotes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when quote not found", async () => {
    mockSession();
    mockPrismaFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), mockParams);
    const body = await response.json();
    if (response.status !== 404) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(404);
    expect(body.error).toBe("QUOTE_NOT_FOUND");
  });

  it("returns quote when found", async () => {
    mockSession();
    mockPrismaFindFirst.mockResolvedValue({
      id: "quote-1",
      title: "Test Quote",
      status: "DRAFT",
    });

    const response = await GET(makeRequest("GET"), mockParams);
    const body = await response.json();
    if (response.status !== 200) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(200);
    expect(body.id).toBe("quote-1");
  });
});

describe("PATCH /api/quotes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires action field", async () => {
    mockSession();

    const response = await PATCH(makeRequest("PATCH", {}), mockParams);
    const body = await response.json();
    if (response.status !== 400) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "action is required (approve|mark-sent|customer-accept|customer-reject)",
    );
  });

  it("rejects unknown action", async () => {
    mockSession();

    const response = await PATCH(
      makeRequest("PATCH", { action: "unknown" }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 400) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(400);
    expect(body.error).toBe("Unknown action: unknown");
  });

  it("approves a quote", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({
      id: "quote-1",
      status: "APPROVED",
    });

    const response = await PATCH(
      makeRequest("PATCH", { action: "approve" }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 200) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(200);
    expect(body.status).toBe("APPROVED");
    expect(mockExecuteAction.mock.calls[0][0]).toBe("quote.approve");
  });

  it("marks quote as sent", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({ id: "quote-1", status: "SENT" });

    const response = await PATCH(
      makeRequest("PATCH", { action: "mark-sent" }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 200) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(200);
    expect(body.status).toBe("SENT");
  });

  it("records customer accept", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({
      id: "quote-1",
      status: "ACCEPTED",
    });

    const response = await PATCH(
      makeRequest("PATCH", {
        action: "customer-accept",
        customerNotes: "Will deposit next week",
      }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 200) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(200);
    expect(mockExecuteAction.mock.calls[0][1].customerNotes).toBe(
      "Will deposit next week",
    );
  });

  it("requires rejectReason for customer-reject", async () => {
    mockSession();

    const response = await PATCH(
      makeRequest("PATCH", { action: "customer-reject" }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 400) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(400);
    expect(body.error).toBe("rejectReason is required for customer-reject");
  });

  it("records customer reject", async () => {
    mockSession();
    mockExecuteAction.mockResolvedValue({
      id: "quote-1",
      status: "REJECTED",
    });

    const response = await PATCH(
      makeRequest("PATCH", {
        action: "customer-reject",
        rejectReason: "Too expensive",
      }),
      mockParams,
    );
    const body = await response.json();
    if (response.status !== 200) {
      console.log("UNEXPECTED ERROR:", body);
    }
    expect(response.status).toBe(200);
    expect(mockExecuteAction.mock.calls[0][1].rejectReason).toBe(
      "Too expensive",
    );
  });
});

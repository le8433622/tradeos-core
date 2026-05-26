import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@tradeos/database", () => ({
  prisma: {
    immutableAuditEvent: {
      findFirst: mockFindFirst,
      create: mockCreate,
      findMany: mockFindMany,
      update: mockUpdate,
    },
  },
}));

const {
  canonicalJson,
  appendAuditEvent,
  getChain,
  validateChain,
  computeHashForVerification,
} = await import("../index");

beforeEach(() => {
  vi.clearAllMocks();
});

const ORG = "org-test-1";

function makeEventData(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    organizationId: ORG,
    actorUserId: null,
    eventType: "PURCHASE_BASELINE_CREATED" as const,
    subjectType: "sourcingRun",
    subjectId: "sr-1",
    actionName: null,
    riskLevel: null,
    inputHash: null,
    resultHash: null,
    evidenceIds: null,
    payload: null,
    redactedPayload: null,
    previousHash: null,
    eventHash: "placeholder",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeValidEvent(overrides: Record<string, unknown> = {}) {
  const base = makeEventData(overrides);
  const hash = computeHashForVerification(base);
  return { ...base, eventHash: hash };
}

describe("canonicalJson", () => {
  it("produces deterministic output for same object regardless of key order", () => {
    const a = canonicalJson({ b: 2, a: 1, c: [3, { z: 9, y: 8 }] });
    const b = canonicalJson({ c: [3, { y: 8, z: 9 }], a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2,"c":[3,{"y":8,"z":9}]}');
  });

  it("handles null, booleans, strings, numbers", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(false)).toBe("false");
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson("hello")).toBe('"hello"');
  });

  it("handles nested arrays and objects", () => {
    expect(canonicalJson({ a: [{ b: 1 }, { c: 2 }] })).toBe('{"a":[{"b":1},{"c":2}]}');
  });

  it("produces same hash regardless of key insertion order", () => {
    const obj1 = { name: "test", value: 42, nested: { a: 1, b: 2 } };
    const obj2 = { nested: { b: 2, a: 1 }, value: 42, name: "test" };
    expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
  });
});

describe("appendAuditEvent", () => {
  it("creates event with hash linked to previous event", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockImplementationOnce((args: { data: Record<string, unknown> }) => {
      return { id: "evt-1", createdAt: new Date(), ...args.data, previousHash: null };
    });

    const result1 = await appendAuditEvent({
      organizationId: ORG,
      eventType: "PURCHASE_BASELINE_CREATED",
      subjectType: "sourcingRun",
      subjectId: "sr-1",
      payload: { baseline: "data" },
    });

    expect(result1.previousHash).toBeNull();
    expect(result1.eventHash).toBeTruthy();

    mockFindFirst.mockResolvedValueOnce({ eventHash: result1.eventHash });
    mockCreate.mockImplementationOnce((args: { data: Record<string, unknown> }) => {
      return { id: "evt-2", createdAt: new Date(), ...args.data, previousHash: result1.eventHash };
    });

    const result2 = await appendAuditEvent({
      organizationId: ORG,
      eventType: "SUPPLIER_ALTERNATIVE_ADDED",
      subjectType: "sourcingRun",
      subjectId: "sr-1",
      payload: { quote: "data" },
    });

    expect(result2.previousHash).toBe(result1.eventHash);
  });
});

describe("getChain", () => {
  it("returns events ordered by createdAt", async () => {
    const events = [
      makeEventData({ id: "evt-1", createdAt: new Date("2025-01-01") }),
      makeEventData({ id: "evt-2", createdAt: new Date("2025-01-02") }),
    ];
    mockFindMany.mockResolvedValueOnce(events);

    const chain = await getChain({ organizationId: ORG });
    expect(chain).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: ORG },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  });

  it("filters by subject", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await getChain({
      organizationId: ORG,
      subjectType: "sourcingRun",
      subjectId: "sr-1",
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG,
        subjectType: "sourcingRun",
        subjectId: "sr-1",
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  });
});

describe("validateChain", () => {
  it("passes for valid chain", async () => {
    const event = makeValidEvent({ id: "evt-1" });
    mockFindMany.mockResolvedValueOnce([event]);

    const result = await validateChain({ organizationId: ORG });
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("detects hash tampering", async () => {
    const valid = makeValidEvent({ id: "evt-1" });
    const event = { ...valid, eventHash: "tampered_hash" };
    mockFindMany.mockResolvedValueOnce([event]);

    const result = await validateChain({ organizationId: ORG });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.reason.includes("Event hash mismatch"))).toBe(true);
  });

  it("detects broken chain link", async () => {
    const ev1 = makeValidEvent({ id: "evt-1" });
    const ev2 = makeValidEvent({
      id: "evt-2",
      eventType: "SUPPLIER_ALTERNATIVE_ADDED",
      createdAt: new Date("2025-01-02T00:00:00.000Z"),
      previousHash: "wrong_prev_hash",
    });
    mockFindMany.mockResolvedValueOnce([ev1, ev2]);

    const result = await validateChain({ organizationId: ORG });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.reason.includes("Previous hash mismatch"))).toBe(true);
  });
});

describe("computeHashForVerification", () => {
  it("reproduces the same hash when given the same data", () => {
    const ev1 = makeEventData();
    const hash1 = computeHashForVerification(ev1);
    const hash2 = computeHashForVerification(ev1);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different events", () => {
    const ev1 = makeEventData({ eventType: "PURCHASE_BASELINE_CREATED", createdAt: new Date("2025-01-01T00:00:00.000Z") });
    const ev2 = makeEventData({ eventType: "SUPPLIER_ALTERNATIVE_ADDED", createdAt: new Date("2025-01-02T00:00:00.000Z") });
    const hash1 = computeHashForVerification(ev1);
    const hash2 = computeHashForVerification(ev2);
    expect(hash1).not.toBe(hash2);
  });
});

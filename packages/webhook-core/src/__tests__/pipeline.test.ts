import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  webhookEvent: {
    create: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@tradeos/database", () => ({
  prisma: mockPrisma,
  Prisma: { DbNull: "DB_NULL" },
  ChannelType: { WHATSAPP: "WHATSAPP", ZALO: "ZALO", EMAIL: "EMAIL" },
}));

import {
  buildWebhookEventKey,
  checkWebhookRateLimit,
  getSourceIp,
  receiveWebhookEvent,
  requireWebhookTenant,
} from "../index";
import { processWebhookRequest } from "../pipeline";

describe("receiveWebhookEvent", () => {
  const params = {
    organizationId: "org-1",
    channel: "WHATSAPP" as const,
    eventKey: "WHATSAPP:ext-123:msg-456:hello",
    sourceIp: "1.2.3.4",
    payload: { text: "hello" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a RECEIVED event and returns { duplicate: false, event }", async () => {
    const fakeEvent = {
      id: "evt-1",
      ...params,
      status: "RECEIVED",
      receivedAt: new Date(),
    };
    mockPrisma.webhookEvent.create.mockResolvedValue(fakeEvent);

    const result = await receiveWebhookEvent(params);

    expect(mockPrisma.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        channel: "WHATSAPP",
        eventKey: "WHATSAPP:ext-123:msg-456:hello",
        sourceIp: "1.2.3.4",
        payload: { text: "hello" },
        status: "RECEIVED",
      },
    });
    expect(result).toEqual({ duplicate: false, event: fakeEvent });
  });

  it("returns { duplicate: true, event } when unique constraint triggers and existing event found", async () => {
    const createError = new Error("Unique constraint failed");
    const existingEvent = {
      id: "evt-existing",
      ...params,
      status: "RECEIVED",
      receivedAt: new Date(),
    };
    mockPrisma.webhookEvent.create.mockRejectedValue(createError);
    mockPrisma.webhookEvent.findFirst.mockResolvedValue(existingEvent);

    const result = await receiveWebhookEvent(params);

    expect(mockPrisma.webhookEvent.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        channel: "WHATSAPP",
        eventKey: "WHATSAPP:ext-123:msg-456:hello",
      },
    });
    expect(result).toEqual({ duplicate: true, event: existingEvent });
  });

  it("re-throws error when Prisma create fails and no existing event found", async () => {
    const dbError = new Error("Database connection failed");
    mockPrisma.webhookEvent.create.mockRejectedValue(dbError);
    mockPrisma.webhookEvent.findFirst.mockResolvedValue(null);

    await expect(receiveWebhookEvent(params)).rejects.toThrow(
      "Database connection failed",
    );
  });

  it("passes null sourceIp as undefined", async () => {
    const fakeEvent = {
      id: "evt-2",
      ...params,
      sourceIp: undefined,
      status: "RECEIVED",
      receivedAt: new Date(),
    };
    mockPrisma.webhookEvent.create.mockResolvedValue(fakeEvent);

    await receiveWebhookEvent({ ...params, sourceIp: null });

    const callArgs = mockPrisma.webhookEvent.create.mock.calls[0][0];
    expect(callArgs.data.sourceIp).toBeUndefined();
  });

  it("handles undefined payload gracefully", async () => {
    const fakeEvent = {
      id: "evt-3",
      organizationId: "org-1",
      channel: "WHATSAPP",
      eventKey: "k",
      status: "RECEIVED",
    };
    mockPrisma.webhookEvent.create.mockResolvedValue(fakeEvent);

    await receiveWebhookEvent({
      organizationId: "org-1",
      channel: "WHATSAPP",
      eventKey: "k",
    });

    const callArgs = mockPrisma.webhookEvent.create.mock.calls[0][0];
    expect(callArgs.data.payload).toBeUndefined();
  });
});

describe("buildWebhookEventKey", () => {
  it("returns same output for same inputs (deterministic)", () => {
    const params = {
      channel: "WHATSAPP" as const,
      externalId: "ext-1",
      messageId: "msg-1",
      text: "hello",
    };
    expect(buildWebhookEventKey(params)).toBe(buildWebhookEventKey(params));
  });

  it("returns different keys for different channels", () => {
    const params = { externalId: "ext-1", messageId: "msg-1", text: "hello" };
    const whatsappKey = buildWebhookEventKey({
      ...params,
      channel: "WHATSAPP" as const,
    });
    const zaloKey = buildWebhookEventKey({
      ...params,
      channel: "ZALO" as const,
    });
    expect(whatsappKey).not.toBe(zaloKey);
  });

  it("truncates text at MAX_EVENT_KEY_TEXT_LENGTH (120)", () => {
    const longText = "a".repeat(200);
    const result = buildWebhookEventKey({
      channel: "EMAIL" as const,
      text: longText,
    });
    const textPart = result.split(":").pop()!;
    expect(textPart.length).toBe(120);
  });

  it("includes channel, externalId, messageId in key", () => {
    const result = buildWebhookEventKey({
      channel: "WHATSAPP" as const,
      externalId: "ext-1",
      messageId: "msg-1",
      text: "hi",
    });
    expect(result).toBe("WHATSAPP:ext-1:msg-1:hi");
  });

  it("returns channel name when no other fields provided", () => {
    const result = buildWebhookEventKey({ channel: "ZALO" as const });
    expect(result).toBe("ZALO");
  });
});

describe("checkWebhookRateLimit", () => {
  const params = {
    organizationId: "org-1",
    channel: "WHATSAPP" as const,
    sourceIp: "1.2.3.4",
    windowSeconds: 60,
    maxEvents: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows event when count is below max", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(30);

    const result = await checkWebhookRateLimit(params);

    expect(result).toEqual({
      allowed: true,
      count: 30,
      maxEvents: 60,
      windowSeconds: 60,
    });
  });

  it("rate limits when count reaches maxEvents", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(60);

    const result = await checkWebhookRateLimit(params);

    expect(result).toEqual({
      allowed: false,
      count: 60,
      maxEvents: 60,
      windowSeconds: 60,
    });
  });

  it("rate limits when count exceeds maxEvents", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(99);

    const result = await checkWebhookRateLimit(params);

    expect(result.allowed).toBe(false);
  });

  it("queries with correct time window", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    mockPrisma.webhookEvent.count.mockResolvedValue(5);

    await checkWebhookRateLimit(params);

    expect(mockPrisma.webhookEvent.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        channel: "WHATSAPP",
        receivedAt: { gte: new Date("2025-01-01T00:00:00Z") },
        sourceIp: "1.2.3.4",
      },
    });
  });

  it("different org is not rate limited independently", async () => {
    mockPrisma.webhookEvent.count
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(0);

    const org1 = await checkWebhookRateLimit(params);
    const org2 = await checkWebhookRateLimit({
      ...params,
      organizationId: "org-2",
    });

    expect(org1.allowed).toBe(false);
    expect(org2.allowed).toBe(true);
  });

  it("defaults window to 60 and maxEvents to 60 when not provided", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(0);

    const result = await checkWebhookRateLimit({
      organizationId: "org-1",
      channel: "EMAIL" as const,
    });

    expect(result).toEqual({
      allowed: true,
      count: 0,
      maxEvents: 60,
      windowSeconds: 60,
    });
  });

  it("omits sourceIp filter when not provided", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(0);

    await checkWebhookRateLimit({
      organizationId: "org-1",
      channel: "EMAIL" as const,
    });

    const where = mockPrisma.webhookEvent.count.mock.calls[0][0].where;
    expect(where.sourceIp).toBeUndefined();
  });
});

describe("requireWebhookTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns tenant when WEBHOOK_SECRET env matches X-Webhook-Secret header", async () => {
    vi.stubEnv("WEBHOOK_SECRET", "shared-secret");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_WEBHOOK_ORG_HEADER", "true");
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: {
        "x-webhook-secret": "shared-secret",
        "x-organization-id": "org-99",
      },
    });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: "org-99" });

    const tenant = await requireWebhookTenant(request);

    expect(tenant).toMatchObject({
      organizationId: "org-99",
      userId: "webhook",
      role: "OPERATOR",
    });
  });

  it("throws WEBHOOK_SECRET_INVALID when WEBHOOK_SECRET is set but header mismatches", async () => {
    vi.stubEnv("WEBHOOK_SECRET", "real-secret");
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-webhook-secret": "wrong-secret" },
    });

    await expect(requireWebhookTenant(request)).rejects.toThrow(
      "WEBHOOK_SECRET_INVALID",
    );
  });

  it("throws WEBHOOK_SECRET_NOT_CONFIGURED in production with no WEBHOOK_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SECRET", "");

    await expect(
      requireWebhookTenant(new Request("https://tradeos.local/api/webhooks")),
    ).rejects.toThrow("WEBHOOK_SECRET_NOT_CONFIGURED");
  });

  it("returns demo tenant in development with no secret and no org header", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBHOOK_SECRET", "");
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const tenant = await requireWebhookTenant(
      new Request("https://tradeos.local/api/webhooks"),
    );

    expect(tenant).toMatchObject({
      userId: "demo-user",
      organizationId: "demo-org",
      role: "OWNER",
    });
  });

  it("returns real demo user from database in non-production when user exists", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBHOOK_SECRET", "");
    const fakeUser = {
      id: "user-1",
      organizationId: "org-1",
      role: "ADMIN",
      email: "owner@tradeos.local",
    };
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);

    const tenant = await requireWebhookTenant(
      new Request("https://tradeos.local/api/webhooks"),
    );

    expect(tenant).toMatchObject({
      userId: "user-1",
      organizationId: "org-1",
      role: "ADMIN",
    });
  });

  it("respects X-Tradeos-Webhook-Secret header alias", async () => {
    vi.stubEnv("WEBHOOK_SECRET", "shared-secret");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_AUTH", "false");
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-tradeos-webhook-secret": "shared-secret" },
    });

    await expect(requireWebhookTenant(request)).rejects.toThrow(
      "WEBHOOK_TENANT_REQUIRED",
    );
  });

  it("throws WEBHOOK_TENANT_REQUIRED when no org header and demo auth is disabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SECRET", "valid");
    vi.stubEnv("ALLOW_DEMO_AUTH", "false");
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-webhook-secret": "valid" },
    });

    await expect(requireWebhookTenant(request)).rejects.toThrow(
      "WEBHOOK_TENANT_REQUIRED",
    );
  });
});

describe("getSourceIp", () => {
  it("returns first IP from X-Forwarded-For", () => {
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.2, 192.0.2.3" },
    });
    expect(getSourceIp(request)).toBe("203.0.113.1");
  });

  it("returns IP from X-Real-IP", () => {
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-real-ip": "10.0.0.42" },
    });
    expect(getSourceIp(request)).toBe("10.0.0.42");
  });

  it("prefers X-Forwarded-For over X-Real-IP", () => {
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" },
    });
    expect(getSourceIp(request)).toBe("1.1.1.1");
  });

  it('returns null when no IP headers present (no "unknown" fallback)', () => {
    const request = new Request("https://tradeos.local/api/webhooks");
    expect(getSourceIp(request)).toBeNull();
  });

  it("trims whitespace from forwarded IP", () => {
    const request = new Request("https://tradeos.local/api/webhooks", {
      headers: { "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" },
    });
    expect(getSourceIp(request)).toBe("10.0.0.1");
  });
});

describe("processWebhookRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payloads larger than the actual body byte limit", async () => {
    const request = new Request("https://tradeos.local/api/webhooks", {
      method: "POST",
      body: JSON.stringify({ text: "a".repeat(300 * 1024) }),
    });
    const tenantResolver = vi.fn().mockResolvedValue({
      organizationId: "org-1",
      userId: "webhook",
      role: "OPERATOR",
    });

    const response = await processWebhookRequest({
      request,
      channel: "WHATSAPP" as const,
      extractMessage: (body) => body as { text: string },
      tenantResolver,
      adapters: {
        ingestMessage: vi.fn(),
      },
    });

    expect(response.status).toBe(413);
    expect(tenantResolver).not.toHaveBeenCalled();
  });

  it("marks webhook FAILED when agent execution throws", async () => {
    mockPrisma.webhookEvent.count.mockResolvedValue(0);
    mockPrisma.webhookEvent.create.mockResolvedValue({
      id: "evt-1",
      status: "RECEIVED",
    });
    mockPrisma.webhookEvent.update.mockResolvedValue({
      id: "evt-1",
      status: "FAILED",
    });
    const ingestMessage = vi
      .fn()
      .mockResolvedValue({ message: { id: "msg-1" } });
    const runAgent = vi.fn().mockRejectedValue(new Error("agent exploded"));

    const response = await processWebhookRequest({
      request: new Request("https://tradeos.local/api/webhooks", {
        method: "POST",
        body: JSON.stringify({ text: "hello" }),
      }),
      channel: "WHATSAPP" as const,
      extractMessage: (body) => body as { text: string },
      tenantResolver: vi.fn().mockResolvedValue({
        organizationId: "org-1",
        userId: "webhook",
        role: "OPERATOR",
      }),
      adapters: {
        ingestMessage,
        runAgent,
      },
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "agent exploded",
      }),
    });
  });
});

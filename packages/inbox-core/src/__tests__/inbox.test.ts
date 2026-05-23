import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindFirst,
  mockConversationUpdate,
  mockConversationCreate,
  mockMessageCreate,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockConversationUpdate: vi.fn(),
  mockConversationCreate: vi.fn(),
  mockMessageCreate: vi.fn(),
}));

vi.mock("@tradeos/database", () => ({
  prisma: {
    conversation: {
      findFirst: mockFindFirst,
      update: mockConversationUpdate,
      create: mockConversationCreate,
    },
    message: { create: mockMessageCreate },
  },
}));

vi.mock("@tradeos/policy-core", async () => {
  const actual = await vi.importActual("@tradeos/policy-core");
  const mod = actual as Record<string, unknown>;
  return {
    ...mod,
    executeAction: vi.fn(
      async (name: string, input: unknown, context: unknown) => {
        const action = (mod as any).getAction(name);
        if (!action) throw new Error(`Unknown action: ${name}`);
        return action.handler(input, {
          ...(context as any),
          prismaTransactionClient: undefined,
        });
      },
    ),
  };
});

import { ingestInboundMessage, normalizeChannel } from "../index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inbox-core", () => {
  it("updates an existing tenant conversation and stores a message", async () => {
    mockFindFirst.mockResolvedValue({
      id: "conversation-1",
      title: "Old title",
    });
    mockConversationUpdate.mockResolvedValue({
      id: "conversation-1",
      title: "New title",
    });
    mockMessageCreate.mockResolvedValue({
      id: "message-1",
      conversationId: "conversation-1",
    });

    const result = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "EMAIL",
      externalId: "thread-1",
      title: "New title",
      content: "Need quotation",
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        channel: "EMAIL",
        externalId: "thread-1",
      },
    });
    expect(result.message.id).toBe("message-1");
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conversation-1",
        content: "Need quotation",
      }),
    });
  });

  it("normalizes unknown channels to WEB", () => {
    expect(normalizeChannel("zalo")).toBe("ZALO");
    expect(normalizeChannel("not-real")).toBe("WEB");
  });

  it("creates new conversation when no externalId provided", async () => {
    mockConversationCreate.mockResolvedValue({
      id: "conv-1",
      title: "Inbound WEB conversation",
    });
    mockMessageCreate.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    });

    const result = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "WEB",
      content: "Hello from web",
    });

    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        channel: "WEB",
        externalId: undefined,
      }),
    });
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conv-1",
        content: "Hello from web",
      }),
    });
    expect(result.conversation.id).toBe("conv-1");
    expect(result.message.id).toBe("msg-1");
  });

  it("creates new conversation when externalId is first seen", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({
      id: "conv-2",
      title: "Inbound EMAIL conversation",
    });
    mockMessageCreate.mockResolvedValue({
      id: "msg-2",
      conversationId: "conv-2",
    });

    const result = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "EMAIL",
      externalId: "new-thread-1",
      title: "New inquiry",
      content: "Need pricing",
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        channel: "EMAIL",
        externalId: "new-thread-1",
      },
    });
    expect(mockConversationCreate).toHaveBeenCalled();
    expect(result.conversation.id).toBe("conv-2");
  });

  it("reuses existing conversation for multiple messages with same externalId", async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: "conv-1", title: "Thread" })
      .mockResolvedValueOnce({ id: "conv-1", title: "Thread" });
    mockConversationUpdate
      .mockResolvedValueOnce({ id: "conv-1", title: "Updated" })
      .mockResolvedValueOnce({ id: "conv-1", title: "Updated again" });
    mockMessageCreate
      .mockResolvedValueOnce({ id: "msg-1", conversationId: "conv-1" })
      .mockResolvedValueOnce({ id: "msg-2", conversationId: "conv-1" });

    const first = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "EMAIL",
      externalId: "thread-1",
      title: "First message",
      content: "Hello",
    });

    const second = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "EMAIL",
      externalId: "thread-1",
      title: "Second message",
      content: "Follow-up",
    });

    expect(first.message.conversationId).toBe("conv-1");
    expect(second.message.conversationId).toBe("conv-1");
    expect(mockConversationUpdate).toHaveBeenCalledTimes(2);
    expect(mockConversationCreate).not.toHaveBeenCalled();
  });

  it("preserves tenant isolation in queries", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({
      id: "conv-3",
      title: "Conversation",
    });
    mockMessageCreate.mockResolvedValue({
      id: "msg-3",
      conversationId: "conv-3",
    });

    await ingestInboundMessage({
      organizationId: "org-2",
      channel: "WHATSAPP",
      externalId: "wa-1",
      content: "Cross-tenant test",
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-2",
        channel: "WHATSAPP",
        externalId: "wa-1",
      },
    });
    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: "org-2" }),
    });
  });

  it("handles empty content without crashing", async () => {
    mockConversationCreate.mockResolvedValue({
      id: "conv-4",
      title: "Inbound WEB conversation",
    });
    mockMessageCreate.mockResolvedValue({
      id: "msg-4",
      conversationId: "conv-4",
    });

    const result = await ingestInboundMessage({
      organizationId: "org-1",
      channel: "WEB",
      content: "",
    });

    expect(result.conversation.id).toBe("conv-4");
    expect(result.message.id).toBe("msg-4");
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: "" }),
    });
  });
});

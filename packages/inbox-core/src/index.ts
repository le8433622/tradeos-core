import {
  prisma,
  type ChannelType,
  type Prisma,
  type SenderType,
} from "@tradeos/database";
import {
  registerAction,
  executeAction,
  type ActionContext,
  type ActorRole,
} from "@tradeos/policy-core";
import { z, ZodError } from "zod";

function safeParse<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("INVALID_REQUEST_BODY");
    }
    throw error;
  }
}

const DEFAULT_INBOX_ROLES: ActorRole[] = [
  "OWNER",
  "ADMIN",
  "SALES",
  "OPERATOR",
];

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

export type IngestInboundMessageInput = {
  organizationId: string;
  channel: ChannelType;
  externalId?: string;
  title?: string;
  senderType?: SenderType;
  content: string;
  metadata?: Prisma.InputJsonValue;
};

export const ingestMessageAction = registerAction<
  IngestInboundMessageInput,
  unknown
>({
  name: "inbox.ingestMessage",
  description: "Ingest an inbound message, creating or updating conversation.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_INBOX_ROLES,
  requiresApprovalForAI: false,
  handler: async (input: IngestInboundMessageInput, context: ActionContext) => {
    const parsed = safeParse(ingestInboundMessageSchema, input);
    const client = db(context);

    let conversation: { id: string; title: string | null };

    if (parsed.externalId) {
      const existing = await client.conversation.findFirst({
        where: {
          organizationId: parsed.organizationId,
          channel: parsed.channel,
          externalId: parsed.externalId,
        },
      });

      if (existing) {
        conversation = await client.conversation.update({
          where: { id: existing.id },
          data: {
            title: parsed.title ?? existing.title,
            aiSummary: parsed.content.slice(0, 240),
            metadata: parsed.metadata,
          },
        });
      } else {
        conversation = await client.conversation.create({
          data: {
            organizationId: parsed.organizationId,
            channel: parsed.channel,
            externalId: parsed.externalId,
            title: parsed.title ?? `Inbound ${parsed.channel} conversation`,
            aiSummary: parsed.content.slice(0, 240),
            metadata: parsed.metadata,
          },
        });
      }
    } else {
      conversation = await client.conversation.create({
        data: {
          organizationId: parsed.organizationId,
          channel: parsed.channel,
          externalId: parsed.externalId,
          title: parsed.title ?? `Inbound ${parsed.channel} conversation`,
          aiSummary: parsed.content.slice(0, 240),
          metadata: parsed.metadata,
        },
      });
    }

    const message = await client.message.create({
      data: {
        conversationId: conversation.id,
        senderType: parsed.senderType ?? "CUSTOMER",
        content: parsed.content,
        metadata: parsed.metadata,
      },
    });

    return { conversation, message };
  },
});

export async function ingestInboundMessage(input: IngestInboundMessageInput) {
  const context: ActionContext = {
    organizationId: input.organizationId,
    role: "OPERATOR",
    source: "system",
  };
  return executeAction<IngestInboundMessageInput, unknown>(
    "inbox.ingestMessage",
    input,
    context,
  ) as Promise<{
    conversation: { id: string; title: string | null };
    message: { id: string; conversationId: string };
  }>;
}

export const ingestInboundMessageSchema = z
  .object({
    organizationId: z.string().min(1),
    channel: z.enum(["WEB", "ZALO", "WHATSAPP", "EMAIL", "TELEGRAM", "MANUAL"]),
    externalId: z.string().max(256).optional(),
    title: z.string().max(512).optional(),
    senderType: z.enum(["USER", "CUSTOMER", "AI", "SYSTEM"]).optional(),
    content: z.string().max(16384),
    metadata: z.any().optional(),
  })
  .strict();

export function normalizeChannel(channel?: string): ChannelType {
  const value = (channel ?? "WEB").toUpperCase();
  if (
    ["WEB", "ZALO", "WHATSAPP", "EMAIL", "TELEGRAM", "MANUAL"].includes(value)
  ) {
    return value as ChannelType;
  }
  return "WEB";
}

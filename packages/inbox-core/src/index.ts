import { prisma, type ChannelType, type SenderType } from '@tradeos/database';

export type IngestInboundMessageInput = {
  organizationId: string;
  channel: ChannelType;
  externalId?: string;
  title?: string;
  senderType?: SenderType;
  content: string;
  metadata?: Record<string, unknown>;
};

async function findOrCreateConversation(input: IngestInboundMessageInput) {
  if (input.externalId) {
    const existing = await prisma.conversation.findFirst({
      where: {
        organizationId: input.organizationId,
        channel: input.channel,
        externalId: input.externalId,
      },
    });

    if (existing) {
      return prisma.conversation.update({
        where: { id: existing.id },
        data: {
          title: input.title ?? existing.title,
          aiSummary: input.content.slice(0, 240),
          metadata: input.metadata,
        },
      });
    }
  }

  return prisma.conversation.create({
    data: {
      organizationId: input.organizationId,
      channel: input.channel,
      externalId: input.externalId,
      title: input.title ?? `Inbound ${input.channel} conversation`,
      aiSummary: input.content.slice(0, 240),
      metadata: input.metadata,
    },
  });
}

export async function ingestInboundMessage(input: IngestInboundMessageInput) {
  const conversation = await findOrCreateConversation(input);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: input.senderType ?? 'CUSTOMER',
      content: input.content,
      metadata: input.metadata,
    },
  });

  return { conversation, message };
}

export function normalizeChannel(channel?: string): ChannelType {
  const value = (channel ?? 'WEB').toUpperCase();
  if (['WEB', 'ZALO', 'WHATSAPP', 'EMAIL', 'TELEGRAM', 'MANUAL'].includes(value)) {
    return value as ChannelType;
  }
  return 'WEB';
}

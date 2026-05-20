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

export async function ingestInboundMessage(input: IngestInboundMessageInput) {
  const conversation = input.externalId
    ? await prisma.conversation.upsert({
        where: {
          id: input.externalId.startsWith('conv_') ? input.externalId : undefined,
        },
        update: {
          title: input.title,
          aiSummary: input.content.slice(0, 240),
          metadata: input.metadata,
        },
        create: {
          organizationId: input.organizationId,
          channel: input.channel,
          externalId: input.externalId,
          title: input.title ?? `Inbound ${input.channel} conversation`,
          aiSummary: input.content.slice(0, 240),
          metadata: input.metadata,
        },
      }).catch(async () => {
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
      })
    : await prisma.conversation.create({
        data: {
          organizationId: input.organizationId,
          channel: input.channel,
          title: input.title ?? `Inbound ${input.channel} conversation`,
          aiSummary: input.content.slice(0, 240),
          metadata: input.metadata,
        },
      });

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

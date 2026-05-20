import { prisma, type ChannelType } from '@tradeos/database';

export type VerifyWebhookSecretInput = {
  requestSecret?: string | null;
  expectedSecret?: string | null;
};

export function verifyWebhookSecret(input: VerifyWebhookSecretInput) {
  if (!input.expectedSecret) return true;
  return Boolean(input.requestSecret && input.requestSecret === input.expectedSecret);
}

export function buildWebhookEventKey(params: {
  channel: ChannelType;
  externalId?: string;
  messageId?: string;
  text?: string;
}) {
  const raw = [params.channel, params.externalId, params.messageId, params.text?.slice(0, 120)].filter(Boolean).join(':');
  return raw || `${params.channel}:${Date.now()}`;
}

export async function receiveWebhookEvent(params: {
  organizationId: string;
  channel: ChannelType;
  eventKey: string;
  sourceIp?: string | null;
  payload?: unknown;
}) {
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        organizationId: params.organizationId,
        channel: params.channel,
        eventKey: params.eventKey,
        sourceIp: params.sourceIp ?? undefined,
        payload: params.payload === undefined ? undefined : JSON.parse(JSON.stringify(params.payload)),
        status: 'RECEIVED',
      },
    });
    return { event, duplicate: false };
  } catch (error) {
    const existing = await prisma.webhookEvent.findFirst({
      where: {
        organizationId: params.organizationId,
        channel: params.channel,
        eventKey: params.eventKey,
      },
    });

    if (existing) {
      await prisma.webhookEvent.update({
        where: { id: existing.id },
        data: { status: 'DUPLICATE' },
      });
      return { event: existing, duplicate: true };
    }

    throw error;
  }
}

export async function markWebhookProcessed(params: {
  eventId: string;
  result?: unknown;
}) {
  return prisma.webhookEvent.update({
    where: { id: params.eventId },
    data: {
      status: 'PROCESSED',
      result: params.result === undefined ? undefined : JSON.parse(JSON.stringify(params.result)),
      processedAt: new Date(),
    },
  });
}

export async function markWebhookFailed(params: {
  eventId: string;
  error: string;
  result?: unknown;
}) {
  return prisma.webhookEvent.update({
    where: { id: params.eventId },
    data: {
      status: 'FAILED',
      error: params.error,
      result: params.result === undefined ? undefined : JSON.parse(JSON.stringify(params.result)),
      processedAt: new Date(),
    },
  });
}

export async function checkWebhookRateLimit(params: {
  organizationId: string;
  channel: ChannelType;
  sourceIp?: string | null;
  windowSeconds?: number;
  maxEvents?: number;
}) {
  const windowSeconds = params.windowSeconds ?? 60;
  const maxEvents = params.maxEvents ?? 60;
  const since = new Date(Date.now() - windowSeconds * 1000);

  const count = await prisma.webhookEvent.count({
    where: {
      organizationId: params.organizationId,
      channel: params.channel,
      receivedAt: { gte: since },
      ...(params.sourceIp ? { sourceIp: params.sourceIp } : {}),
    },
  });

  return {
    allowed: count < maxEvents,
    count,
    maxEvents,
    windowSeconds,
  };
}

export function getRequestSecret(request: Request) {
  return request.headers.get('x-tradeos-webhook-secret') ?? request.headers.get('x-webhook-secret');
}

export function getSourceIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');
}

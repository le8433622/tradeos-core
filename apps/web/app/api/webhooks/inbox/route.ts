import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireSessionFromRequest } from '@tradeos/auth';
import { ingestInboundMessage, normalizeChannel } from '@tradeos/inbox-core';
import {
  buildWebhookEventKey,
  checkWebhookRateLimit,
  getRequestSecret,
  getSourceIp,
  markWebhookFailed,
  markWebhookProcessed,
  receiveWebhookEvent,
  verifyWebhookSecret,
} from '@tradeos/webhook-core';

export async function POST(request: Request) {
  const session = await requireSessionFromRequest(request);
  const sourceIp = getSourceIp(request);
  let eventId: string | undefined;

  try {
    if (!verifyWebhookSecret({
      requestSecret: getRequestSecret(request),
      expectedSecret: process.env.WEBHOOK_SECRET,
    })) {
      return NextResponse.json({ error: 'WEBHOOK_SECRET_INVALID' }, { status: 401 });
    }

    const body = await request.json();
    const channel = normalizeChannel(body.channel);
    const text = String(body.text ?? body.message ?? body.content ?? '');

    if (!text) {
      return NextResponse.json({ error: 'MESSAGE_TEXT_REQUIRED' }, { status: 400 });
    }

    const rateLimit = await checkWebhookRateLimit({
      organizationId: session.organizationId,
      channel,
      sourceIp,
      windowSeconds: 60,
      maxEvents: 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED', rateLimit }, { status: 429 });
    }

    const eventKey = buildWebhookEventKey({
      channel,
      externalId: body.externalId ?? body.threadId ?? body.conversationId,
      messageId: body.messageId,
      text,
    });

    const received = await receiveWebhookEvent({
      organizationId: session.organizationId,
      channel,
      eventKey,
      sourceIp,
      payload: body,
    });

    eventId = received.event.id;

    if (received.duplicate) {
      return NextResponse.json({ duplicate: true, event: received.event }, { status: 200 });
    }

    const inbox = await ingestInboundMessage({
      organizationId: session.organizationId,
      channel,
      externalId: body.externalId ?? body.threadId ?? body.conversationId,
      title: body.title ?? `Inbound ${channel}`,
      content: text,
      metadata: body,
    });

    const agent = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: channel.toLowerCase() as any,
        text,
        customerName: body.customerName ?? body.name,
        customerPhone: body.customerPhone ?? body.phone,
        customerEmail: body.customerEmail ?? body.email,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: 'ai',
      },
    );

    await markWebhookProcessed({ eventId, result: { inboxId: inbox.message.id, intent: agent.plan.intent } });

    return NextResponse.json({ inbox, agent });
  } catch (error) {
    if (eventId) {
      await markWebhookFailed({
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

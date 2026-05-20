import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireDemoSession } from '@tradeos/auth';
import { ingestInboundMessage, normalizeChannel } from '@tradeos/inbox-core';

export async function POST(request: Request) {
  try {
    const session = await requireDemoSession();
    const body = await request.json();
    const channel = normalizeChannel(body.channel);
    const text = String(body.text ?? body.message ?? body.content ?? '');

    if (!text) {
      return NextResponse.json({ error: 'MESSAGE_TEXT_REQUIRED' }, { status: 400 });
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

    return NextResponse.json({ inbox, agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

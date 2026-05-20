import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireDemoSession } from '@tradeos/auth';
import { ingestInboundMessage } from '@tradeos/inbox-core';

export async function POST(request: Request) {
  try {
    const session = await requireDemoSession();
    const body = await request.json();
    const text = String(body.text ?? body.body ?? body.plain ?? body.html ?? '');

    if (!text) {
      return NextResponse.json({ error: 'EMAIL_BODY_REQUIRED' }, { status: 400 });
    }

    const inbox = await ingestInboundMessage({
      organizationId: session.organizationId,
      channel: 'EMAIL',
      externalId: body.messageId ?? body.threadId ?? body.from,
      title: body.subject ?? 'Inbound email conversation',
      content: text,
      metadata: body,
    });

    const agent = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: 'email',
        text,
        customerName: body.fromName ?? body.name,
        customerEmail: body.fromEmail ?? body.email ?? body.from,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: 'ai',
      },
    );

    return NextResponse.json({ ok: true, inbox, agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireDemoSession } from '@tradeos/auth';
import { ingestInboundMessage } from '@tradeos/inbox-core';

function extractZaloText(body: any) {
  return String(
    body?.message?.text ??
    body?.text ??
    body?.message ??
    body?.event_name ??
    ''
  );
}

function extractZaloExternalId(body: any) {
  return String(
    body?.sender?.id ??
    body?.user_id ??
    body?.oa_id ??
    body?.thread_id ??
    ''
  );
}

export async function POST(request: Request) {
  try {
    const session = await requireDemoSession();
    const body = await request.json();
    const text = extractZaloText(body);

    if (!text) {
      return NextResponse.json({ error: 'ZALO_MESSAGE_TEXT_REQUIRED' }, { status: 400 });
    }

    const externalId = extractZaloExternalId(body) || undefined;

    const inbox = await ingestInboundMessage({
      organizationId: session.organizationId,
      channel: 'ZALO',
      externalId,
      title: 'Inbound Zalo conversation',
      content: text,
      metadata: body,
    });

    const agent = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: 'zalo',
        text,
        customerName: body?.sender?.name ?? body?.name,
        customerPhone: body?.phone,
        customerEmail: body?.email,
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

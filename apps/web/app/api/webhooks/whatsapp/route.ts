import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireDemoSession } from '@tradeos/auth';
import { ingestInboundMessage } from '@tradeos/inbox-core';

function extractWhatsAppMessage(body: any) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  return {
    text: String(message?.text?.body ?? body?.text ?? body?.message ?? ''),
    externalId: String(message?.from ?? body?.from ?? body?.threadId ?? ''),
    name: value?.contacts?.[0]?.profile?.name ?? body?.name,
    phone: message?.from ?? body?.phone,
  };
}

export async function POST(request: Request) {
  try {
    const session = await requireDemoSession();
    const body = await request.json();
    const parsed = extractWhatsAppMessage(body);

    if (!parsed.text) {
      return NextResponse.json({ error: 'WHATSAPP_MESSAGE_TEXT_REQUIRED' }, { status: 400 });
    }

    const inbox = await ingestInboundMessage({
      organizationId: session.organizationId,
      channel: 'WHATSAPP',
      externalId: parsed.externalId || undefined,
      title: 'Inbound WhatsApp conversation',
      content: parsed.text,
      metadata: body,
    });

    const agent = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: 'whatsapp',
        text: parsed.text,
        customerName: parsed.name,
        customerPhone: parsed.phone,
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

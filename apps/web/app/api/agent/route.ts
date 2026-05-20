import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runTradeAgent(
      {
        organizationId: body.organizationId ?? 'demo-org',
        channel: body.channel ?? 'web',
        text: body.text ?? '',
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
      },
      {
        actorUserId: body.actorUserId ?? 'demo-user',
        organizationId: body.organizationId ?? 'demo-org',
        role: body.role ?? 'OWNER',
        source: 'ai',
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

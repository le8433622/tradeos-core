import { NextResponse } from 'next/server';
import { runTradeAgent } from '@tradeos/ai-core';
import { requireSessionFromRequest } from '@tradeos/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await requireSessionFromRequest(request);

    const result = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: body.channel ?? 'web',
        text: body.text ?? '',
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: 'ai',
        approved: Boolean(body.approved),
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

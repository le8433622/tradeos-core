import { NextResponse } from 'next/server';
import { rejectRequest } from '@tradeos/approval-core';
import { requireDemoSession } from '@tradeos/auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireDemoSession();
  const params = await context.params;
  const approval = await rejectRequest({
    approvalRequestId: params.id,
    reviewedById: session.userId,
    reviewNote: 'Rejected from TradeOS web console',
  });
  return NextResponse.json({ approval });
}

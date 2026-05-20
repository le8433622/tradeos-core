import { NextResponse } from 'next/server';
import { executeApprovedRequest, failApprovalRequest } from '@tradeos/approval-core';
import { requireDemoSession } from '@tradeos/auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireDemoSession();
  const params = await context.params;

  try {
    const approval = await executeApprovedRequest({
      approvalRequestId: params.id,
      context: {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: 'manual',
        approved: true,
      },
    });
    return NextResponse.json({ approval });
  } catch (error) {
    await failApprovalRequest({
      approvalRequestId: params.id,
      result: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

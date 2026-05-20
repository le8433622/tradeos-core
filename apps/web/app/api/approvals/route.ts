import { NextResponse } from 'next/server';
import { createApprovalRequest } from '@tradeos/approval-core';
import { requireDemoSession } from '@tradeos/auth';
import { prisma } from '@tradeos/database';

export async function GET() {
  const session = await requireDemoSession();
  const approvals = await prisma.approvalRequest.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ approvals });
}

export async function POST(request: Request) {
  const session = await requireDemoSession();
  const body = await request.json();
  const approval = await createApprovalRequest({
    organizationId: session.organizationId,
    requestedById: session.userId,
    actionName: body.actionName,
    riskLevel: body.riskLevel ?? 'HIGH',
    input: body.input ?? {},
    reason: body.reason,
  });
  return NextResponse.json({ approval }, { status: 201 });
}

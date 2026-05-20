import { NextResponse } from 'next/server';
import { prisma } from '@tradeos/database';

const organizationId = 'demo-org';

export async function GET() {
  const quotations = await prisma.quotation.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ quotations });
}

export async function POST(request: Request) {
  const body = await request.json();
  const quotation = await prisma.quotation.create({
    data: {
      organizationId,
      leadId: body.leadId,
      title: body.title,
      content: body.content,
      status: 'DRAFT',
      totalAmount: body.totalAmount,
      currency: body.currency ?? 'USD',
    },
  });
  return NextResponse.json({ quotation }, { status: 201 });
}

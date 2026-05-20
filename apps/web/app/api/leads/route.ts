import { NextResponse } from 'next/server';
import { prisma } from '@tradeos/database';

const organizationId = 'demo-org';

export async function GET() {
  const leads = await prisma.lead.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const body = await request.json();
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      source: body.source ?? 'manual',
      name: body.name,
      phone: body.phone,
      email: body.email,
      need: body.need,
      status: body.status ?? 'NEW',
      nextAction: body.nextAction,
    },
  });
  return NextResponse.json({ lead }, { status: 201 });
}

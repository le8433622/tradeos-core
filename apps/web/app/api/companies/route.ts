import { NextResponse } from 'next/server';
import { prisma } from '@tradeos/database';

const organizationId = 'demo-org';

export async function GET() {
  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const body = await request.json();
  const company = await prisma.company.create({
    data: {
      organizationId,
      name: body.name,
      country: body.country,
      industry: body.industry,
      type: body.type ?? 'OTHER',
      website: body.website,
      notes: body.notes,
    },
  });
  return NextResponse.json({ company }, { status: 201 });
}

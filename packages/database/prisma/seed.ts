import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo International Trade Association',
      type: 'ASSOCIATION',
      country: 'Vietnam',
      website: 'https://example.com',
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@tradeos.local' },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'owner@tradeos.local',
      name: 'TradeOS Owner',
      role: 'OWNER',
    },
  });

  const seller = await prisma.company.create({
    data: {
      organizationId: organization.id,
      name: 'Vietnam Premium Exporter',
      country: 'Vietnam',
      industry: 'Agriculture and consumer goods',
      type: 'SELLER',
      website: 'https://seller.example.com',
      notes: 'Demo exporter for pilot matching.',
    },
  });

  await prisma.company.create({
    data: {
      organizationId: organization.id,
      name: 'Singapore Distribution Partner',
      country: 'Singapore',
      industry: 'Distribution and retail',
      type: 'BUYER',
      website: 'https://buyer.example.com',
      notes: 'Demo buyer/distributor for ASEAN market.',
    },
  });

  await prisma.product.create({
    data: {
      organizationId: organization.id,
      name: 'Vietnam Export Sample Product',
      category: 'Consumer Goods',
      description: 'Demo product for quotation and buyer matching flows.',
      originCountry: 'Vietnam',
      priceRange: '1000-5000 USD',
      moq: '100 units',
      certification: 'Demo certification',
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: organization.id,
      companyId: seller.id,
      source: 'web',
      name: 'Demo Buyer',
      email: 'buyer@example.com',
      need: 'Needs quotation for Vietnam export product to Singapore.',
      status: 'QUALIFIED',
      score: 80,
      aiSummary: 'Buyer is interested in import/distribution opportunity.',
      nextAction: 'Prepare quotation draft and schedule follow-up.',
    },
  });

  await prisma.task.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      title: 'Follow up with Demo Buyer',
      description: 'Send catalog and draft quotation for review.',
      status: 'open',
    },
  });

  await prisma.quotation.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      title: 'Demo quotation draft',
      content: 'Draft quotation content for Vietnam export product.',
      status: 'DRAFT',
      totalAmount: 2500,
      currency: 'USD',
    },
  });

  await prisma.conversation.create({
    data: {
      organizationId: organization.id,
      channel: 'WEB',
      title: 'Buyer asks for quotation',
      aiSummary: 'Inbound buyer asks for pricing, MOQ, and delivery timeline.',
      messages: {
        create: [
          {
            senderType: 'CUSTOMER',
            content: 'We need a quotation for export to Singapore.',
          },
          {
            senderType: 'AI',
            content: 'Lead captured. Suggested next action: draft quotation.',
          },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      organizationId: organization.id,
      title: 'Demo trade opportunity',
      body: 'A Singapore distributor is looking for Vietnam export suppliers.',
      audience: 'organization',
      status: 'draft',
    },
  });

  console.log('Seed completed for organization:', organization.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

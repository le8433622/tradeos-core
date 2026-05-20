import { prisma } from '@tradeos/database';
import { SignOutButton } from '../components/sign-out-button';
import { requirePageSession } from '../lib/page-session';

const links = [
  { href: '/leads', label: 'Leads' },
  { href: '/companies', label: 'Companies' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/quotations', label: 'Quotations' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/webhook-events', label: 'Webhook Events' },
  { href: '/audit-logs', label: 'Audit Logs' },
  { href: '/login', label: 'Login' },
];

export default async function Page() {
  const session = await requirePageSession();
  const organizationId = session.organizationId;
  const [leadCount, companyCount, quotationCount, taskCount, approvalCount, webhookEventCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.company.count({ where: { organizationId } }),
    prisma.quotation.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId } }),
    prisma.approvalRequest.count({ where: { organizationId, status: 'PENDING' } }),
    prisma.webhookEvent.count({ where: { organizationId } }),
  ]);

  const cards = [
    { title: 'Leads', value: leadCount, note: 'Inbound trade opportunities' },
    { title: 'Companies', value: companyCount, note: 'Buyers, sellers, partners' },
    { title: 'Quotations', value: quotationCount, note: 'Drafts and sent quotes' },
    { title: 'Tasks', value: taskCount, note: 'Follow-up work queue' },
    { title: 'Pending Approvals', value: approvalCount, note: 'High-risk actions waiting for review' },
    { title: 'Webhook Events', value: webhookEventCount, note: 'Inbound events with idempotency log' },
  ];

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <span style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>
          TradeOS Core MVP
        </span>
        <SignOutButton />
      </div>
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>AI Operating System for International Trade</h1>
      <p style={{ maxWidth: 760, color: '#4b5563', fontSize: 18 }}>
        Tenant: {organizationId}. Auth provider: {session.authProvider}. Dashboard reads real data from Prisma.
      </p>

      <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '24px 0' }}>
        {links.map((link) => (
          <a key={link.href} href={link.href} style={{ background: '#111827', color: 'white', padding: '10px 14px', borderRadius: 12, textDecoration: 'none' }}>
            {link.label}
          </a>
        ))}
      </nav>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {cards.map((card) => (
          <div key={card.title} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{card.title}</h2>
            <strong style={{ display: 'block', fontSize: 36, marginTop: 12 }}>{card.value}</strong>
            <p style={{ color: '#6b7280' }}>{card.note}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

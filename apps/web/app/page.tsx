import { prisma } from '@tradeos/database';
import { requireDemoSession } from '@tradeos/auth';

const links = [
  { href: '/leads', label: 'Leads' },
  { href: '/companies', label: 'Companies' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/quotations', label: 'Quotations' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/audit-logs', label: 'Audit Logs' },
];

export default async function Page() {
  const session = await requireDemoSession();
  const organizationId = session.organizationId;
  const [leadCount, companyCount, quotationCount, taskCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.company.count({ where: { organizationId } }),
    prisma.quotation.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId } }),
  ]);

  const cards = [
    { title: 'Leads', value: leadCount, note: 'Inbound trade opportunities' },
    { title: 'Companies', value: companyCount, note: 'Buyers, sellers, partners' },
    { title: 'Quotations', value: quotationCount, note: 'Drafts and sent quotes' },
    { title: 'Tasks', value: taskCount, note: 'Follow-up work queue' },
  ];

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <span style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>
        TradeOS Core MVP
      </span>
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>AI Operating System for International Trade</h1>
      <p style={{ maxWidth: 760, color: '#4b5563', fontSize: 18 }}>
        Demo tenant: {organizationId}. Dashboard reads real data from Prisma. Replace demo session with real auth before production.
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

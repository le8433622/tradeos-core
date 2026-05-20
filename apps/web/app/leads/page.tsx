import { prisma } from '@tradeos/database';
import { requirePageSession } from '../../lib/page-session';

async function createLead(formData: FormData) {
  'use server';
  const session = await requirePageSession();
  await prisma.lead.create({
    data: {
      organizationId: session.organizationId,
      source: String(formData.get('source') || 'manual'),
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      need: String(formData.get('need') || ''),
      status: 'NEW',
    },
  });
}

export default async function LeadsPage() {
  const session = await requirePageSession();
  const leads = await prisma.lead.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Leads</h1>
      <p>Tenant: {session.organizationId}. Inbound trade opportunities from web, Zalo, WhatsApp, email, events, and manual input.</p>

      <form action={createLead} style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 24 }}>
        <input name="name" placeholder="Lead name" style={{ padding: 10 }} />
        <input name="email" placeholder="Email" style={{ padding: 10 }} />
        <input name="phone" placeholder="Phone" style={{ padding: 10 }} />
        <input name="source" placeholder="Source: manual/web/zalo" defaultValue="manual" style={{ padding: 10 }} />
        <textarea name="need" placeholder="Trade need" style={{ padding: 10 }} />
        <button type="submit" style={{ padding: 12, background: '#111827', color: 'white', borderRadius: 10 }}>Create lead</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Name</th>
            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Source</th>
            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Status</th>
            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Need</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{lead.name}</td>
              <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{lead.source}</td>
              <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{lead.status}</td>
              <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{lead.need}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

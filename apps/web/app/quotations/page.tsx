import { prisma } from '@tradeos/database';

async function createQuotation(formData: FormData) {
  'use server';
  const amountRaw = String(formData.get('totalAmount') || '');
  await prisma.quotation.create({
    data: {
      organizationId: 'demo-org',
      title: String(formData.get('title') || ''),
      content: String(formData.get('content') || ''),
      status: 'DRAFT',
      currency: String(formData.get('currency') || 'USD'),
      totalAmount: amountRaw ? Number(amountRaw) : undefined,
    },
  });
}

export default async function QuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    where: { organizationId: 'demo-org' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Quotations</h1>
      <p>AI may draft quotations, but humans must review before sending.</p>

      <form action={createQuotation} style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 24 }}>
        <input name="title" placeholder="Quotation title" required style={{ padding: 10 }} />
        <textarea name="content" placeholder="Quotation content" required style={{ padding: 10 }} />
        <input name="currency" placeholder="Currency" defaultValue="USD" style={{ padding: 10 }} />
        <input name="totalAmount" placeholder="Total amount" type="number" step="0.01" style={{ padding: 10 }} />
        <button type="submit" style={{ padding: 12, background: '#111827', color: 'white', borderRadius: 10 }}>Create draft quotation</button>
      </form>

      {quotations.map((quote) => (
        <article key={quote.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{quote.title}</strong>
          <p>Status: {quote.status}</p>
          <p>Amount: {quote.totalAmount?.toString() || 'TBD'} {quote.currency || ''}</p>
          <p>{quote.content}</p>
        </article>
      ))}
    </main>
  );
}

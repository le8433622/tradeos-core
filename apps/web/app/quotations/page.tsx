const quotations = [
  { title: 'Draft quotation for buyer', status: 'DRAFT', amount: 'TBD' },
];

export default function QuotationsPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Quotations</h1>
      <p>AI may draft quotations, but humans must review before sending.</p>
      {quotations.map((quote) => (
        <article key={quote.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{quote.title}</strong>
          <p>Status: {quote.status}</p>
          <p>Amount: {quote.amount}</p>
        </article>
      ))}
    </main>
  );
}

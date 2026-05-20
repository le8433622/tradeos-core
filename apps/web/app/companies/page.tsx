const companies = [
  { name: 'Sample Exporter Vietnam', type: 'SELLER', country: 'Vietnam' },
  { name: 'Sample Import Partner', type: 'BUYER', country: 'Singapore' },
];

export default function CompaniesPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Companies</h1>
      <p>Buyer, seller, distributor, logistics, and service partner database.</p>
      <ul>
        {companies.map((company) => (
          <li key={company.name} style={{ marginBottom: 12 }}>
            <strong>{company.name}</strong> — {company.type} — {company.country}
          </li>
        ))}
      </ul>
    </main>
  );
}

const sampleLeads = [
  { name: 'Sample buyer', source: 'web', status: 'NEW', need: 'Looking for Vietnamese supplier' },
  { name: 'Sample distributor', source: 'manual', status: 'QUALIFIED', need: 'Needs product catalog and quotation' },
];

export default function LeadsPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Leads</h1>
      <p>Inbound trade opportunities from web, Zalo, WhatsApp, email, events, and manual input.</p>
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
          {sampleLeads.map((lead) => (
            <tr key={lead.name}>
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

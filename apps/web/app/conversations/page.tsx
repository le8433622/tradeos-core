const conversations = [
  { channel: 'web', title: 'Buyer asking for quotation', summary: 'Needs product catalog, MOQ, and delivery time.' },
  { channel: 'manual', title: 'Association event contact', summary: 'Potential distributor, needs follow-up.' },
];

export default function ConversationsPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Conversations</h1>
      <p>AI Inbox abstraction for web, Zalo, WhatsApp, email, Telegram, and manual intake.</p>
      {conversations.map((item) => (
        <article key={item.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{item.title}</strong>
          <p>Channel: {item.channel}</p>
          <p>{item.summary}</p>
        </article>
      ))}
    </main>
  );
}

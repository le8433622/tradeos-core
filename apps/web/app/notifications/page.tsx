const notifications = [
  { title: 'Association opportunity alert', status: 'DRAFT', audience: 'organization' },
  { title: 'System onboarding notice', status: 'DRAFT', audience: 'all' },
];

export default function NotificationsPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Notifications</h1>
      <p>Admin can publish trade opportunities, events, market alerts, and system-wide messages.</p>
      {notifications.map((item) => (
        <article key={item.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{item.title}</strong>
          <p>Status: {item.status}</p>
          <p>Audience: {item.audience}</p>
        </article>
      ))}
    </main>
  );
}

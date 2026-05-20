import { prisma } from '@tradeos/database';
import { requireDemoSession } from '@tradeos/auth';

export default async function WebhookEventsPage() {
  const session = await requireDemoSession();
  const events = await prisma.webhookEvent.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Webhook Events</h1>
      <p>Inbound webhook event log with idempotency, status, payload and result.</p>
      {events.map((event) => (
        <article key={event.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{event.channel} — {event.status}</strong>
          <p>Event key: {event.eventKey}</p>
          <p>Source IP: {event.sourceIp || 'unknown'} | Received: {event.receivedAt.toISOString()}</p>
          <details>
            <summary>Payload / Result</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ payload: event.payload, result: event.result, error: event.error }, null, 2)}</pre>
          </details>
        </article>
      ))}
    </main>
  );
}

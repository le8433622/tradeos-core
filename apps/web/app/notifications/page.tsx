import { prisma } from '@tradeos/database';
import { requirePageSession } from '../../lib/page-session';

async function createNotification(formData: FormData) {
  'use server';
  const session = await requirePageSession();
  await prisma.notification.create({
    data: {
      organizationId: session.organizationId,
      title: String(formData.get('title') || ''),
      body: String(formData.get('body') || ''),
      audience: String(formData.get('audience') || 'organization'),
      status: 'draft',
    },
  });
}

export default async function NotificationsPage() {
  const session = await requirePageSession();
  const notifications = await prisma.notification.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Notifications</h1>
      <p>Tenant: {session.organizationId}. Admin can publish trade opportunities, events, market alerts, and system-wide messages.</p>

      <form action={createNotification} style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 24 }}>
        <input name="title" placeholder="Notification title" required style={{ padding: 10 }} />
        <textarea name="body" placeholder="Notification body" required style={{ padding: 10 }} />
        <input name="audience" placeholder="Audience" defaultValue="organization" style={{ padding: 10 }} />
        <button type="submit" style={{ padding: 12, background: '#111827', color: 'white', borderRadius: 10 }}>Create notification</button>
      </form>

      {notifications.map((item) => (
        <article key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
          <p>Status: {item.status}</p>
          <p>Audience: {item.audience}</p>
        </article>
      ))}
    </main>
  );
}

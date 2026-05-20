import { prisma } from '@tradeos/database';
import { requirePageSession } from '../../lib/page-session';

export default async function ConversationsPage() {
  const session = await requirePageSession();
  const conversations = await prisma.conversation.findMany({
    where: { organizationId: session.organizationId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 3 } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Conversations</h1>
      <p>Tenant: {session.organizationId}. AI Inbox abstraction for web, Zalo, WhatsApp, email, Telegram, and manual intake.</p>
      {conversations.map((item) => (
        <article key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{item.title}</strong>
          <p>Channel: {item.channel}</p>
          <p>{item.aiSummary}</p>
          <ul>
            {item.messages.map((message) => (
              <li key={message.id}><strong>{message.senderType}:</strong> {message.content}</li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}

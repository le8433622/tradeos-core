import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";

export default async function ConversationsPage() {
  const session = await requirePagePermission("message.read");
  const conversations = await prisma.conversation.findMany({
    where: { organizationId: session.organizationId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 3 } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Conversations</h1>
      <p>
        Tenant: {session.organizationId}. AI Inbox abstraction for web, Zalo,
        WhatsApp, email, Telegram, and manual intake.
      </p>
      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Conversations are created automatically from incoming messages across all channels. They will appear here as leads engage with your trade team."
        />
      ) : (
        conversations.map((item) => (
          <article
            key={item.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <a
              href={`/conversations/${item.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <strong>{item.title || "Untitled"}</strong>
            </a>
            <p style={{ color: "#6b7280" }}>Channel: {item.channel}</p>
            {item.aiSummary && (
              <p style={{ color: "#374151" }}>{item.aiSummary}</p>
            )}
            <ul>
              {item.messages.map((message) => (
                <li key={message.id}>
                  <strong>{message.senderType}:</strong> {message.content}
                </li>
              ))}
            </ul>
          </article>
        ))
      )}
    </main>
  );
}

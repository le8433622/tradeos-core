import { notFound } from "next/navigation";
import { prisma } from "@tradeos/database";
import {
  requirePageSession,
  requirePagePermission,
} from "../../../lib/page-session";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("message.read");
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation || conversation.organizationId !== session.organizationId) {
    notFound();
  }

  const senderColors: Record<string, string> = {
    USER: "#2563eb",
    CUSTOMER: "#16a34a",
    AI: "#9333ea",
    SYSTEM: "#6b7280",
  };

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 820 }}
    >
      <a href="/conversations" style={{ color: "#2563eb" }}>
        Back to conversations
      </a>

      <div style={{ margin: "16px 0" }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>
          {conversation.title || "Untitled"}
        </h1>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Channel: {conversation.channel}
          {conversation.externalId ? ` · ID: ${conversation.externalId}` : ""}
        </p>
        <p style={{ color: "#9ca3af", fontSize: 12 }}>
          Created: {new Date(conversation.createdAt).toLocaleString()}
        </p>
      </div>

      {conversation.aiSummary && (
        <div
          style={{
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            margin: "16px 0",
          }}
        >
          <strong style={{ color: "#6b7280", fontSize: 14 }}>AI Summary</strong>
          <p style={{ margin: "8px 0 0", color: "#374151" }}>
            {conversation.aiSummary}
          </p>
        </div>
      )}

      <section style={{ margin: "24px 0" }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>
          Messages ({conversation.messages.length})
        </h2>

        {conversation.messages.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No messages</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      background: senderColors[message.senderType] ?? "#6b7280",
                      color: "white",
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {message.senderType}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    color: "#1f2937",
                  }}
                >
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

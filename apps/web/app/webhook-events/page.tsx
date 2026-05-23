import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import { RetryButton } from "./RetryButton";
import { redactForAudit } from "@tradeos/policy-core";

export default async function WebhookEventsPage() {
  const session = await requirePagePermission("webhook.retry");
  const events = await prisma.webhookEvent.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  const failedCount = events.filter((e) => e.status === "FAILED").length;

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Webhook Events</h1>
      <p>
        Tenant: {session.organizationId}. Inbound webhook event log.{" "}
        <strong>{failedCount} failed</strong> — click Retry to reprocess a
        failed event.
      </p>
      {events.length === 0 ? (
        <EmptyState
          title="No webhook events yet"
          description="Webhook events appear when external services send data to your webhook endpoints. Configure a webhook provider to start receiving events."
        />
      ) : (
        events.map((event) => {
          const isFailed = event.status === "FAILED";
          return (
            <article
              key={event.id}
              style={{
                border: `1px solid ${isFailed ? "#fca5a5" : "#e5e7eb"}`,
                borderLeft: isFailed
                  ? "4px solid #ef4444"
                  : "4px solid transparent",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                background: isFailed ? "#fef2f2" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>
                  {event.channel} — {event.status}
                </strong>
                {isFailed && <RetryButton eventId={event.id} />}
              </div>
              <p>Event key: {event.eventKey}</p>
              <p>
                Source IP: {event.sourceIp || "unknown"} | Received:{" "}
                {event.receivedAt.toISOString()}
              </p>
              {event.error && (
                <p style={{ color: "#dc2626", fontSize: 13 }}>
                  Error: {event.error}
                </p>
              )}
              <details>
                <summary>Payload / Result</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(
                    {
                      payload: redactForAudit(event.payload),
                      result: redactForAudit(event.result),
                      error: event.error,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          );
        })
      )}
    </main>
  );
}

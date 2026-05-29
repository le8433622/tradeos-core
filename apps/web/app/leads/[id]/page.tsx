import { notFound } from "next/navigation";
import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("lead.read");
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { assignee: { select: { name: true } } },
      },
      quotations: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!lead || lead.organizationId !== session.organizationId) {
    notFound();
  }

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/leads" style={{ color: "#2563eb" }}>
        Back to leads
      </a>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>
        {lead.name || "Unnamed lead"}
      </h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        {lead.source} &middot; {lead.status} &middot; Score: {lead.score}
      </p>

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr 1fr",
          margin: "24px 0",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Contact</h2>
          {lead.email && (
            <p>
              <strong>Email:</strong> {lead.email}
            </p>
          )}
          {lead.phone && (
            <p>
              <strong>Phone:</strong> {lead.phone}
            </p>
          )}
          {lead.company && (
            <p>
              <strong>Company:</strong> {lead.company.name}
            </p>
          )}
          {!lead.email && !lead.phone && !lead.company && (
            <p style={{ color: "#9ca3af" }}>No contact details</p>
          )}
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Trade Need</h2>
          <p>
            {lead.need || (
              <span style={{ color: "#9ca3af" }}>No description</span>
            )}
          </p>
          {lead.aiSummary && (
            <>
              <h3 style={{ fontSize: 14, marginTop: 16, color: "#6b7280" }}>
                AI Summary
              </h3>
              <p style={{ color: "#4b5563" }}>{lead.aiSummary}</p>
            </>
          )}
        </div>
      </section>

      <section style={{ margin: "24px 0" }}>
        <h2 style={{ fontSize: 18 }}>Next Action</h2>
        <p>
          {lead.nextAction || <span style={{ color: "#9ca3af" }}>Not set</span>}
        </p>
      </section>

      <section style={{ margin: "24px 0" }}>
        <h2 style={{ fontSize: 18 }}>Tasks ({lead.tasks.length})</h2>
        {lead.tasks.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No follow-up tasks</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Title
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Assignee
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {lead.tasks.map((task) => {
                const now = new Date();
                const isOverdue =
                  task.dueAt &&
                  task.dueAt < now &&
                  task.status !== "completed" &&
                  task.status !== "done";
                return (
                  <tr key={task.id}>
                    <td
                      style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                    >
                      {task.title}
                    </td>
                    <td
                      style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                    >
                      {task.assignee?.name ?? "—"}
                    </td>
                    <td
                      style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                    >
                      {task.status}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #e5e7eb",
                        color: isOverdue ? "#dc2626" : undefined,
                        fontWeight: isOverdue ? 700 : undefined,
                      }}
                    >
                      {task.dueAt
                        ? new Date(task.dueAt).toLocaleDateString()
                        : "—"}
                      {isOverdue ? " (overdue)" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ margin: "24px 0" }}>
        <h2 style={{ fontSize: 18 }}>Quotations ({lead.quotations.length})</h2>
        {lead.quotations.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No quotations</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Title
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lead.quotations.map((q) => (
                <tr key={q.id}>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {q.title}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {q.status}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {q.totalAmount
                      ? `${q.currency ?? ""} ${q.totalAmount}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ color: "#9ca3af", fontSize: 12 }}>
        Created: {new Date(lead.createdAt).toLocaleString()}
      </p>
    </main>
  );
}

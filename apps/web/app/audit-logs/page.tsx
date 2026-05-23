import { prisma, type ActionRiskLevel, type Prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import { AuditFilters } from "./AuditFilters";

function truncateJson(obj: unknown): string {
  const str = JSON.stringify(obj, null, 2);
  if (str.length > 500) return str.slice(0, 500) + "\n... (truncated)";
  return str;
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await requirePagePermission("audit.read");
  const sp = await searchParams;

  const where: Prisma.AuditLogWhereInput = {
    organizationId: session.organizationId,
  };

  if (sp.action) {
    where.actionName = { contains: sp.action, mode: "insensitive" };
  }
  if (sp.risk) {
    where.riskLevel = sp.risk as ActionRiskLevel;
  }
  if (sp.approved === "true") {
    where.approved = true;
  } else if (sp.approved === "false") {
    where.approved = false;
  }
  if (sp.from || sp.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (sp.from) createdAt.gte = new Date(sp.from);
    if (sp.to) createdAt.lte = new Date(sp.to + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const riskBadge: Record<string, { bg: string; text: string }> = {
    LOW: { bg: "#dcfce7", text: "#166534" },
    MEDIUM: { bg: "#fef3c7", text: "#92400e" },
    HIGH: { bg: "#fee2e2", text: "#991b1b" },
    CRITICAL: { bg: "#fce7f3", text: "#9d174d" },
  };

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Audit Logs</h1>
      <p>
        Tenant: {session.organizationId}. Every AI/manual action leaves a trace
        here.
      </p>

      <AuditFilters />

      {logs.length === 0 && (
        <p style={{ color: "#9ca3af", marginTop: 20 }}>
          No audit logs match the filters.
        </p>
      )}

      {logs.map((log) => {
        const badge = riskBadge[log.riskLevel] || {
          bg: "#f3f4f6",
          text: "#374151",
        };
        return (
          <article
            key={log.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong style={{ fontSize: 15 }}>{log.actionName}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: badge.bg,
                    color: badge.text,
                  }}
                >
                  {log.riskLevel}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: log.approved ? "#dcfce7" : "#fee2e2",
                    color: log.approved ? "#166534" : "#991b1b",
                  }}
                >
                  {log.approved ? "Approved" : "Blocked"}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Actor: {log.actorUserId || "system"} &middot;{" "}
              {log.createdAt.toLocaleString()}
            </p>
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 13, cursor: "pointer" }}>
                Input / Result
              </summary>
              <pre
                style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}
              >
                {truncateJson({ input: log.input, result: log.result })}
              </pre>
            </details>
          </article>
        );
      })}
    </main>
  );
}

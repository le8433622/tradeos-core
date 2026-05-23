import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import "@tradeos/crm-core";

async function createLead(formData: FormData) {
  "use server";
  const session = await requirePagePermission("lead.write");
  await executeAction(
    "crm.createLead",
    {
      organizationId: session.organizationId,
      source: String(formData.get("source") || "manual"),
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      need: String(formData.get("need") || ""),
    },
    {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    },
  );
}

export default async function LeadsPage() {
  const session = await requirePagePermission("lead.read");
  const leads = await prisma.lead.findMany({
    where: { organizationId: session.organizationId },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Leads</h1>
      <p>
        Tenant: {session.organizationId}. Inbound trade opportunities from web,
        Zalo, WhatsApp, email, events, and manual input.
      </p>

      <form
        action={createLead}
        style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 24 }}
      >
        <input name="name" placeholder="Lead name" style={{ padding: 10 }} />
        <input name="email" placeholder="Email" style={{ padding: 10 }} />
        <input name="phone" placeholder="Phone" style={{ padding: 10 }} />
        <input
          name="source"
          placeholder="Source: manual/web/zalo"
          defaultValue="manual"
          style={{ padding: 10 }}
        />
        <textarea
          name="need"
          placeholder="Trade need"
          style={{ padding: 10 }}
        />
        <button
          type="submit"
          style={{
            padding: 12,
            background: "#111827",
            color: "white",
            borderRadius: 10,
          }}
        >
          Create lead
        </button>
      </form>

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
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              Name
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              Company
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              Source
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              Status
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              Need
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}
              >
                <p style={{ fontSize: 18, margin: "0 0 4px" }}>No leads yet</p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Leads are created automatically from incoming messages or
                  manually using the form above.
                </p>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id}>
                <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  <a
                    href={`/leads/${lead.id}`}
                    style={{ color: "#2563eb", textDecoration: "none" }}
                  >
                    {lead.name || "Unnamed"}
                  </a>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  {lead.company?.name ?? "—"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  {lead.source}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  {lead.status}
                </td>
                <td
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #e5e7eb",
                    maxWidth: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lead.need}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

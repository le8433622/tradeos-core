import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

const ORG_TYPE_LABELS: Record<string, string> = {
  IMPORTER: "Importer",
  EXPORTER: "Exporter",
  DISTRIBUTOR: "Distributor",
  LOGISTICS: "Logistics",
  SERVICE: "Service",
  ASSOCIATION: "Association",
  OTHER: "Other",
};

export default async function ProfileSettingsPage() {
  const session = await requirePagePermission("settings.profile");
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true, type: true, country: true, plan: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Organization Profile</h1>
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
        }}
      >
        <dl style={{ margin: 0, display: "grid", gap: 16 }}>
          <div>
            <dt
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Name
            </dt>
            <dd style={{ margin: "4px 0 0", fontSize: 16 }}>
              {org?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Type
            </dt>
            <dd style={{ margin: "4px 0 0", fontSize: 16 }}>
              {org ? (ORG_TYPE_LABELS[org.type] ?? org.type) : "—"}
            </dd>
          </div>
          <div>
            <dt
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Country
            </dt>
            <dd style={{ margin: "4px 0 0", fontSize: 16 }}>
              {org?.country ?? "—"}
            </dd>
          </div>
          <div>
            <dt
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Plan
            </dt>
            <dd style={{ margin: "4px 0 0", fontSize: 16 }}>
              {org?.plan ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

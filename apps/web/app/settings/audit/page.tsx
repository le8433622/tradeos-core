import { requirePagePermission } from "../../../lib/page-session";

export default async function AuditSettingsPage() {
  const session = await requirePagePermission("audit.read");
  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Audit Logs</h1>
      <p>View and export audit logs.</p>
    </div>
  );
}

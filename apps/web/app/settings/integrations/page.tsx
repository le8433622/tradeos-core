import { requirePagePermission } from "../../../lib/page-session";

export default async function IntegrationsSettingsPage() {
  const session = await requirePagePermission("integration.manage");
  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Integrations</h1>
      <p>Webhook integration management: add, configure, rotate secrets.</p>
    </div>
  );
}

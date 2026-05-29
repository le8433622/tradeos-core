import { requirePagePermission } from "../../../lib/page-session";
import IntegrationsSettingsForm from "./IntegrationsSettingsForm";

export default async function IntegrationsSettingsPage() {
  await requirePagePermission("integration.manage");
  return <IntegrationsSettingsForm />;
}

import { requirePagePermission } from "../../../lib/page-session";
import PrivacySettingsForm from "./PrivacySettingsForm";

export default async function PrivacySettingsPage() {
  await requirePagePermission("privacy.export");
  return <PrivacySettingsForm />;
}

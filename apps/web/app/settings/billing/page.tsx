import { requirePagePermission } from "../../../lib/page-session";
import BillingSettingsForm from "./BillingSettingsForm";

export default async function BillingSettingsPage() {
  await requirePagePermission("billing.read");
  return <BillingSettingsForm />;
}

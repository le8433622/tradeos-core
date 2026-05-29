import { requirePagePermission } from "../../../lib/page-session";
import { TradePainIntakeForm } from "./trade-pain-intake-form";

export default async function CreateSourcingRunPage() {
  await requirePagePermission("sourcing.create");

  return <TradePainIntakeForm />;
}

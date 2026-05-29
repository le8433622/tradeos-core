import { redirect } from "next/navigation";
import { requirePagePermission } from "../../lib/page-session";

export default async function SettingsPage() {
  await requirePagePermission("settings.profile");
  redirect("/settings/profile");
}

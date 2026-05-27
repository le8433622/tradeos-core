import { redirect } from "next/navigation";
import { requirePageSession } from "../lib/page-session";

export default async function Page() {
  const session = await requirePageSession();

  if (session.role === "OWNER") {
    redirect("/settings/team");
  }
  if (session.role === "VIEWER") {
    redirect("/sourcing-runs?mode=view");
  }
  redirect("/sourcing-runs");
}

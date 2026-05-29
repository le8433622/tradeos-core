import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  resolveSessionFromEmail,
  getDemoSession,
  allowDemoAuth,
  getSessionAal,
} from "@tradeos/auth";
import { createSupabaseServerClient } from "./supabase-server";

export async function requirePageSession() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: sessionData } = await supabase.auth.getSession();

  if (userData.user?.email) {
    const accessToken = sessionData.session?.access_token;
    const mfaLevel = accessToken ? getSessionAal(accessToken) : "aal1";

    const cookieStore = await cookies();
    const activeOrganizationId = cookieStore.get("activeOrganizationId")?.value;

    try {
      return await resolveSessionFromEmail(
        userData.user.email,
        activeOrganizationId,
        mfaLevel,
      );
    } catch {
      redirect("/onboarding/setup");
    }
  }

  if (allowDemoAuth()) {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get("x-demo-auth-email")?.value;
    return getDemoSession(undefined, demoEmail);
  }

  redirect("/login");
}

export async function requirePagePermission(requiredPermission: string) {
  const session = await requirePageSession();
  if (!session.permissions.includes(requiredPermission)) {
    redirect("/?error=permission_denied");
  }
  return session;
}

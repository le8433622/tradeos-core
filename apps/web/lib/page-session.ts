import { redirect } from "next/navigation";
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
    try {
      return await resolveSessionFromEmail(
        userData.user.email,
        undefined,
        mfaLevel,
      );
    } catch {
      redirect("/onboarding/pending");
    }
  }

  if (allowDemoAuth()) {
    return getDemoSession();
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

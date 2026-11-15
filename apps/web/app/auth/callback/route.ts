import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { resolveSessionFromEmail } from "@tradeos/auth";

const SAFE_NEXT = /^\/(?!\/)/;

function getSafeNext(raw: string | null): string {
  if (raw && SAFE_NEXT.test(raw)) return raw;
  return "/";
}

function isChooseWorkspacePath(path: string): boolean {
  return (
    path === "/choose-workspace" ||
    path.startsWith("/choose-workspace/") ||
    path.startsWith("/choose-workspace?") ||
    path.startsWith("/choose-workspace#")
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNext(searchParams.get("next"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=auth_config", origin));
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        try {
          const session = await resolveSessionFromEmail(user.email);
          if (session.memberships.length > 1) {
            const chooseUrl = new URL("/choose-workspace", origin);
            if (next !== "/" && !isChooseWorkspacePath(next)) {
              chooseUrl.searchParams.set("next", next);
            }
            return NextResponse.redirect(chooseUrl);
          }
        } catch {
          // Preserve the existing callback flow for onboarding and recovery.
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}

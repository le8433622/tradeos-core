import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let response = NextResponse.next({ request });
  response.headers.set("X-Request-Id", requestId);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    response.headers.set("X-Request-Id", requestId);
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(
          ({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        response.headers.set("X-Request-Id", requestId);
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options: CookieOptions;
          }) => response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

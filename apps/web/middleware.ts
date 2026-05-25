import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let requestId: string;
  try {
    requestId = crypto.randomUUID();
  } catch {
    requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const response = NextResponse.next({ request });
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

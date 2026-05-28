import { NextRequest, NextResponse } from "next/server";

const DEMO_COOKIE = "x-demo-auth-email";
const DEMO_HEADER = "x-demo-auth-email";

export function middleware(request: NextRequest) {
  const allowDemo =
    process.env.ALLOW_DEMO_AUTH === "true" ||
    process.env.NODE_ENV !== "production";

  if (!allowDemo) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(DEMO_COOKIE)?.value;
  const headerExists = request.headers.has(DEMO_HEADER);

  if (cookieValue && !headerExists) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(DEMO_HEADER, cookieValue);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|globals.css).*)"],
};

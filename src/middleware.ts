import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "ah_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.SESSION_SECRET ?? "alwayshere-dev-secret-change-me",
      );
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// FR-07 — every /api/* route (except NextAuth's own endpoints) requires a
// session. API callers get a JSON 401 instead of next-auth's default HTML
// redirect to /login, which would otherwise break fetch()-based clients.
//
// `authorized` always returns true so this middleware function itself
// always runs (rather than next-auth's built-in redirect firing before we
// get a chance to branch on path) — the auth check happens explicitly below.
export default withAuth(
  function middleware(req) {
    const isApi = req.nextUrl.pathname.startsWith("/api/");
    if (!req.nextauth.token) {
      if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: () => true },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth).*)"],
};

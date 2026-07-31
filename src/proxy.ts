import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Everything not listed here requires a session. Add new public pages to this
// list; forgetting to is a fail-closed mistake, not a fail-open one.
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/auth/login",
  "/auth/signup",
  "/refund-policy",
  "/privacy-policy",
  "/auth/reset-password",
  "/terms-and-conditions",
  "/auth/forgot-password",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

/**
 * Optimistic route protection: this only checks that a session cookie is
 * present, it does not validate it. Every protected page and route handler
 * independently calls getSessionUser(), which is what actually enforces access.
 *
 * It deliberately does nothing about guest-only pages. Turning a signed-in
 * visitor away from login or signup needs to know whether the session is real,
 * and this file cannot: a cookie left behind by an expired session would send
 * the visitor to a protected page, which would send them back to login, which
 * would send them on again, with no way out but clearing cookies by hand. The
 * guest-only pages call redirectIfSignedIn() instead, where the session has
 * actually been validated.
 *
 * In Next.js 16 this file replaces middleware.ts and the exported function is
 * named `proxy` rather than `middleware`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    // Build the URL fresh rather than cloning: cloning would carry the
    // protected page's own query string onto /auth/login alongside `next`.
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// API routes are excluded deliberately. Every one of them authenticates itself
// (or verifies a provider signature), so the proxy adds nothing there, and it
// does real harm: Next buffers the whole request body in memory for a proxied
// request, capped at 10 MB, and silently truncates anything larger. That
// corrupts large uploads posted to a route handler.
//
// The icon and social-image routes are excluded too. Next.js generates them
// from src/app/icon.tsx and src/app/opengraph-image.tsx at extensionless paths
// (/icon, /opengraph-image, and /icon/1 style variants), so the file-extension
// rule below does not catch them. Without this, browsers and social crawlers
// fetching them are redirected to the login page and no preview card renders.
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|(?:icon|apple-icon|opengraph-image|twitter-image)(?:/.*)?$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml)$).*)",
  ],
};

import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { DEFAULT_AFTER_AUTH, safeNextPath } from "@/lib/redirects";

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

const GUEST_ONLY_PATHS = ["/auth/login", "/auth/signup", "/auth/forgot-password"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

function isGuestOnly(pathname: string) {
  return GUEST_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

/**
 * Optimistic route protection: this only checks that a session cookie is
 * present, it does not validate it. Every protected page and route handler
 * independently calls getSessionUser(), which is what actually enforces access.
 *
 * In Next.js 16 this file replaces middleware.ts and the exported function is
 * named `proxy` rather than `middleware`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!getSessionCookie(request);

  if (hasSession && isGuestOnly(pathname)) {
    // Honour the `next` the user was carrying, unless it points back at another
    // guest-only page, which would bounce them straight back here.
    const requested = safeNextPath(request.nextUrl.searchParams.get("next"));
    const requestedPath = requested?.split(/[?#]/)[0] ?? "";
    const target = requested && !isGuestOnly(requestedPath) ? requested : DEFAULT_AFTER_AUTH;
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!hasSession) {
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

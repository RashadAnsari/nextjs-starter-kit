import { beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * redirectIfSignedIn is what keeps signed-in visitors off the login and signup
 * pages now that the proxy no longer tries to. The case that matters is the
 * one the proxy could not get right: a session cookie that no longer resolves
 * to a session must leave the visitor on the login page, not bounce them into
 * a redirect loop with the page they came from.
 */

let session: { user: { id: string } } | null = null;
let redirectedTo: string | null = null;

class RedirectError extends Error {}

mock.module("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
mock.module("next/navigation", () => ({
  redirect: (path: string) => {
    redirectedTo = path;
    // The real redirect() throws to unwind the render, so callers never
    // continue past it. Mimic that, or these tests would prove nothing.
    throw new RedirectError(path);
  },
}));
mock.module("@/lib/auth", () => ({
  auth: { api: { getSession: () => Promise.resolve(session) } },
}));

const { redirectIfSignedIn, getSessionUser } = await import("./auth-session");

/** Run it, swallowing only the redirect unwind. */
async function run(next?: string | null) {
  try {
    await redirectIfSignedIn(next);
  } catch (err) {
    if (!(err instanceof RedirectError)) {
      throw err;
    }
  }
  return redirectedTo;
}

beforeEach(() => {
  session = null;
  redirectedTo = null;
});

describe("redirectIfSignedIn", () => {
  test("lets a signed-out visitor stay on the page", async () => {
    expect(await run("/settings")).toBeNull();
  });

  test("lets a visitor with a cookie but no valid session stay", async () => {
    // The proxy cannot tell this case from a real session, which is exactly
    // why it no longer makes this decision.
    session = null;
    expect(await run("/dashboard")).toBeNull();
  });

  test("sends a signed-in visitor to the default landing page", async () => {
    session = { user: { id: "user_1" } };
    expect(await run(null)).toBe("/dashboard");
  });

  test("honours a safe next", async () => {
    session = { user: { id: "user_1" } };
    expect(await run("/settings")).toBe("/settings");
  });

  test("refuses an off-site next", async () => {
    session = { user: { id: "user_1" } };
    expect(await run("https://evil.example")).toBe("/dashboard");
  });
});

describe("getSessionUser", () => {
  test("returns null when there is no session", async () => {
    expect(await getSessionUser()).toBeNull();
  });

  test("returns the user when there is one", async () => {
    session = { user: { id: "user_1" } };
    expect((await getSessionUser())?.id).toBe("user_1");
  });
});

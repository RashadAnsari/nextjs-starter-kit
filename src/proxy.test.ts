import { beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

/**
 * The proxy is optimistic, so these tests do not prove access control: they
 * pin the routing table around it. The failure that matters is a protected
 * path silently becoming public, which is why an unknown path is asserted to
 * redirect rather than fall through.
 */

let signedIn = false;

mock.module("better-auth/cookies", () => ({
  getSessionCookie: () => (signedIn ? "session-token" : null),
}));

const { proxy } = await import("./proxy");

function visit(path: string) {
  return proxy(new NextRequest(`http://localhost${path}`));
}

/** The Location header of a redirect, as a path with its query string. */
async function locationOf(path: string) {
  const res = await visit(path);
  const location = res.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

beforeEach(() => {
  signedIn = false;
});

describe("proxy, signed out", () => {
  test("lets a public page through", async () => {
    for (const path of ["/", "/pricing", "/auth/login", "/privacy-policy"]) {
      expect((await visit(path)).headers.get("location")).toBeNull();
    }
  });

  test("lets a subpath of a public page through", async () => {
    expect((await visit("/auth/reset-password/abc123")).headers.get("location")).toBeNull();
  });

  test("redirects a protected page to login, carrying it as next", async () => {
    expect(await locationOf("/dashboard")).toBe("/auth/login?next=%2Fdashboard");
  });

  test("carries the protected page's own query string inside next", async () => {
    expect(await locationOf("/checkout?_ptxn=txn_1")).toBe(
      "/auth/login?next=%2Fcheckout%3F_ptxn%3Dtxn_1"
    );
  });

  test("redirects an unknown path rather than treating it as public", async () => {
    // Fail-closed: forgetting to list a new page must lock it, not expose it.
    expect(await locationOf("/some/page/added/later")).toBe(
      "/auth/login?next=%2Fsome%2Fpage%2Fadded%2Flater"
    );
  });
});

describe("proxy, signed in", () => {
  beforeEach(() => {
    signedIn = true;
  });

  test("lets a protected page through", async () => {
    expect((await visit("/dashboard")).headers.get("location")).toBeNull();
  });

  test("sends a guest-only page to the default landing page", async () => {
    expect(await locationOf("/auth/login")).toBe("/dashboard");
  });

  test("honours a safe next on a guest-only page", async () => {
    expect(await locationOf("/auth/login?next=%2Fsettings")).toBe("/settings");
  });

  test("ignores a next that points back at another guest-only page", async () => {
    // Honouring it would bounce the user between two guest-only pages.
    expect(await locationOf("/auth/login?next=%2Fauth%2Fsignup")).toBe("/dashboard");
  });

  test("ignores an off-site next", async () => {
    expect(await locationOf("/auth/login?next=https%3A%2F%2Fevil.example")).toBe("/dashboard");
  });
});

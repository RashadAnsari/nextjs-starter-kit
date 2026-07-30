import { describe, expect, test } from "bun:test";
import { afterAuthPath, DEFAULT_AFTER_AUTH, safeNextPath, withNext } from "./redirects";

describe("safeNextPath", () => {
  test("returns null for missing values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  test("accepts same-origin paths and preserves search and hash", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/settings?tab=billing#top")).toBe("/settings?tab=billing#top");
  });

  test("resolves relative paths against the site root", () => {
    expect(safeNextPath("dashboard")).toBe("/dashboard");
  });

  test("rejects absolute URLs to other origins", () => {
    expect(safeNextPath("https://evil.example/phish")).toBeNull();
    expect(safeNextPath("http://evil.example")).toBeNull();
  });

  test("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.example/phish")).toBeNull();
  });

  test("rejects backslash variants browsers normalise to //host", () => {
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("\\/evil.example")).toBeNull();
    expect(safeNextPath("\\\\evil.example")).toBeNull();
  });

  test("rejects non-http schemes", () => {
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("mailto:a@evil.example")).toBeNull();
    expect(safeNextPath("data:text/html,x")).toBeNull();
  });
});

describe("afterAuthPath", () => {
  test("falls back to the default for missing or hostile values", () => {
    expect(afterAuthPath(null)).toBe(DEFAULT_AFTER_AUTH);
    expect(afterAuthPath("https://evil.example")).toBe(DEFAULT_AFTER_AUTH);
  });

  test("honours a safe next path", () => {
    expect(afterAuthPath("/settings")).toBe("/settings");
  });
});

describe("withNext", () => {
  test("appends an encoded next parameter", () => {
    expect(withNext("/auth/login", "/settings?tab=billing")).toBe(
      "/auth/login?next=%2Fsettings%3Ftab%3Dbilling"
    );
  });

  test("leaves the auth path bare when next is missing or hostile", () => {
    expect(withNext("/auth/login", null)).toBe("/auth/login");
    expect(withNext("/auth/login", "https://evil.example")).toBe("/auth/login");
  });
});

// Where the auth flows send a user when there is no `next` to honour.
export const DEFAULT_AFTER_AUTH = "/dashboard";

// Only used to resolve relative paths. Any `next` that parses to a different
// origin than this one is rejected, so the value can never leave the site.
const INTERNAL_ORIGIN = "https://next.invalid";

/**
 * Normalises a `next` query value to a same-origin path, or null when it is
 * missing or points anywhere else.
 *
 * `next` comes from the URL, so it is attacker-controlled: without this an
 * emailed /auth/login?next=https://evil.example link would bounce a freshly
 * signed-in user off-site. Parsing against a fixed origin rejects absolute
 * URLs, protocol-relative //host, backslash variants that browsers normalise
 * to //host, and non-http schemes, all in one check.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== INTERNAL_ORIGIN) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function afterAuthPath(value: string | null | undefined): string {
  return safeNextPath(value) ?? DEFAULT_AFTER_AUTH;
}

export function withNext(authPath: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `${authPath}?next=${encodeURIComponent(safe)}` : authPath;
}

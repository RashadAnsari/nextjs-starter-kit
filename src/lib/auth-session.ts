import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { afterAuthPath } from "@/lib/redirects";

/** The signed-in user for the current request, or null. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/**
 * Send a signed-in visitor away from a guest-only page: login, signup, and the
 * password reset request. Every one of those pages must call this.
 *
 * The check belongs here rather than in the proxy, which sees only that a
 * session cookie exists. A cookie that no longer resolves to a session would
 * have the proxy bounce the visitor to a protected page, that page bounce them
 * back to login, and the two redirect at each other forever. Validating where
 * the answer is actually known makes that loop impossible to write.
 */
export async function redirectIfSignedIn(next?: string | null) {
  if (await getSessionUser()) {
    redirect(afterAuthPath(next));
  }
}

import { redirectIfSignedIn } from "@/lib/auth-session";
import { LoginClient } from "./LoginClient";

/**
 * `next` is the page the user was trying to reach before being sent here, set
 * by the proxy on a protected route or by a CTA that needs an account first.
 */
export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await props.searchParams;
  await redirectIfSignedIn(next);
  return <LoginClient next={next ?? null} />;
}

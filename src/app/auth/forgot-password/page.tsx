import { redirectIfSignedIn } from "@/lib/auth-session";
import { ForgotPasswordClient } from "./ForgotPasswordClient";

/**
 * Guest-only, like login and signup: someone already signed in has no reason
 * to ask for a reset link, and can change their password from settings.
 */
export default async function ForgotPasswordPage() {
  await redirectIfSignedIn(null);
  return <ForgotPasswordClient />;
}

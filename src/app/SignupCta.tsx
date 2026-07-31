"use client";

import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

/**
 * A call to action that invites a visitor to sign up, and sends them to the
 * dashboard instead once they have. Pointing a signed-in visitor at
 * /auth/signup does not show them the signup page, because that page turns
 * them away again, so the button would silently do something other than what
 * its label says.
 *
 * The session is read in the browser, as the navbar does, so the page holding
 * this stays static. While it loads, the signed-out label is the safe guess:
 * most visitors to a landing page are signed out.
 */
interface Props {
  children: React.ReactNode;
  /** Label once the visitor is signed in, when the button leads to the dashboard. */
  signedInLabel: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

export function SignupCta({ children, signedInLabel, variant, size }: Props) {
  const { data: session } = authClient.useSession();

  return session?.user ? (
    <Button href="/dashboard" variant={variant} size={size}>
      {signedInLabel}
    </Button>
  ) : (
    <Button href="/auth/signup" variant={variant} size={size}>
      {children}
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

interface Props {
  children: React.ReactNode;
  /** Label once signed in, when the button leads to the dashboard instead. */
  signedInLabel: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

/**
 * Invites a visitor to sign up, and points at the dashboard once they have:
 * a signed-in visitor sent to /auth/signup is turned away by that page, so the
 * button would do something other than what its label says.
 *
 * The session is read in the browser, as the navbar does, so the page holding
 * this stays static. Until it resolves, signed out is the safe guess.
 */
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

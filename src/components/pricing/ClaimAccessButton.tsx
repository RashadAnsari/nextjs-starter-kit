"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WELCOME_GIFT_REDIRECT } from "@/components/ui/WelcomeGiftModal";
import { withNext } from "@/lib/redirects";

interface Props {
  /** Where to send the visitor when access cannot be granted automatically. */
  contactHref: string;
  variant?: "primary" | "outline" | "white";
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * Claims complimentary access, which is what the pricing CTA does while no
 * payment provider is configured. It grants access server-side and moves the
 * visitor to the dashboard, where the welcome gift modal explains what they got.
 *
 * When the grant cannot be made, for example because the account already has a
 * subscription row, the same button falls back to the contact link rather than
 * dead-ending on an error.
 */
export function ClaimAccessButton({
  contactHref,
  variant = "primary",
  fullWidth,
  children,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/complimentary", { method: "POST" });
      if (res.status === 401) {
        router.push(withNext("/auth/signup", "/pricing"));
        return;
      }

      const data = await res.json();
      if (res.ok && data.granted) {
        router.push(WELCOME_GIFT_REDIRECT);
        return;
      }

      setLoading(false);
      window.location.href = contactHref;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} fullWidth={fullWidth} disabled={loading} onClick={handleClick}>
        {loading ? "Redirecting…" : children}
      </Button>
      {error && <p className="text-center text-xs text-[var(--red)]">{error}</p>}
    </div>
  );
}

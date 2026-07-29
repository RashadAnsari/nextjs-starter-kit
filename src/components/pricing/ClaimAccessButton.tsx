"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { withNext } from "@/lib/redirects";

/**
 * Shown instead of CheckoutButton while no payment provider is configured, so
 * the whole signup-to-access path works before billing is set up. It grants the
 * complimentary plan and drops the user on the dashboard.
 */
export function ClaimAccessButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/payments/complimentary", { method: "POST" });

    if (res.status === 401) {
      router.push(withNext("/auth/signup", "/pricing"));
      return;
    }

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    if (!data.granted) {
      setError("You already have access. Head to your dashboard to get started.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorBanner message={error} onHide={() => setError(null)} />
      <Button variant="primary" fullWidth disabled={loading} onClick={handleClick}>
        {loading ? "Setting up…" : children}
      </Button>
    </div>
  );
}

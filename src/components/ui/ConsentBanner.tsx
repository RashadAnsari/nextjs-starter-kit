"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { revokeAnalyticsConsent } from "@/lib/analytics";
import { OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";

// Cookie consent banner. Shows on first visit until a choice is made, and can
// be re-opened from the footer "Cookie Preferences" link. Reject and Accept are
// given equal prominence, as required for valid consent under EU law.
export function ConsentBanner({ measurementId }: { measurementId: string }) {
  const [visible, setVisible] = useState(false);

  // Decide visibility after mount so the server and first client render agree
  // (both render nothing), avoiding a hydration mismatch.
  useEffect(() => {
    const open = () => setVisible(true);
    if (readConsent() === null) {
      open();
    }
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  function accept() {
    writeConsent("accepted");
    setVisible(false);
  }

  function reject() {
    writeConsent("rejected");
    // Stop GA for the rest of this session if it was already loaded before the
    // visitor withdrew consent. Future page loads simply never render the script.
    (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = true;
    revokeAnalyticsConsent();
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--gray-200)] bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-[var(--brand-700)]" />

        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="consent-title" className="text-lg font-semibold text-[var(--gray-900)]">
              We value your privacy
            </h2>
            <p className="text-sm leading-relaxed text-[var(--gray-600)]">
              We use analytics cookies to understand how visitors use {site.name} so we can improve
              it. These cookies load only if you accept. You can change your choice anytime via
              Cookie Preferences in the footer. See our{" "}
              <Link
                href="/privacy-policy"
                className="font-medium underline text-[var(--brand-700)]"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-3 sm:flex-shrink-0">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={reject}>
              Reject
            </Button>
            <Button variant="primary" size="sm" className="flex-1 sm:flex-none" onClick={accept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

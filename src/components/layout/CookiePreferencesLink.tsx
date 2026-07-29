"use client";

import { openConsentBanner } from "@/lib/consent";

// Footer link that re-opens the cookie consent banner so visitors can change or
// withdraw their analytics consent at any time.
export function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={openConsentBanner}
      className="text-left hover:text-white transition-colors"
    >
      Cookie Preferences
    </button>
  );
}

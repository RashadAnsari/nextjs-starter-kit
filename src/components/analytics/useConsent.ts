"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGE_EVENT, type ConsentValue, readConsent } from "@/lib/consent";

// Reads the stored consent choice and keeps it in sync with changes made in
// this tab (custom event) or another tab (storage event).
export function useConsent(): ConsentValue | null {
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return consent;
}

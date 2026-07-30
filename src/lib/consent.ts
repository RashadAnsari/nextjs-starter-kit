// Cookie consent state shared across the consent banner and the analytics
// loader. Analytics scripts must never load before the visitor opts in, so the
// stored choice is the single source of truth for whether Google Analytics may
// run. State lives in localStorage (not a cookie) so nothing is written to the
// browser before consent is given.

export type ConsentValue = "accepted" | "rejected";

export const CONSENT_STORAGE_KEY = "cookie-consent";

// Fired whenever the stored choice changes, so mounted components re-read it.
export const CONSENT_CHANGE_EVENT = "app:consent-change";

// Fired to re-open the banner from the footer "Cookie Preferences" link.
export const OPEN_CONSENT_EVENT = "app:open-consent";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: ConsentValue) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage can throw in private mode; the in-session event still propagates.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: value }));
}

export function openConsentBanner() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

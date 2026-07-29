import { sendGAEvent } from "@next/third-parties/google";

type EventPayload = Record<string, string | number | boolean>;

// The dataLayer only exists once the visitor has accepted analytics cookies
// and GA has loaded (see GoogleAnalytics.tsx), so before consent every
// command is a no-op. Window.dataLayer is declared by @next/third-parties.
function gaCommand(...args: (string | EventPayload)[]) {
  if (typeof window !== "undefined" && window.dataLayer) {
    sendGAEvent(...args);
  }
}

/** Sends a custom event to Google Analytics. */
function track(event: string, data?: EventPayload) {
  gaCommand("event", event, data ?? {});
}

/**
 * Tells an already-loaded GA to stop using analytics storage after the visitor
 * withdraws consent mid-session.
 */
export function revokeAnalyticsConsent() {
  gaCommand("consent", "update", { analytics_storage: "denied" });
}

/** Add your product's own events here. Keep the names snake_case, as GA expects. */
export const analytics = {
  signUp: () => track("sign_up"),
  logIn: () => track("log_in"),
  logOut: () => track("log_out"),
  passwordReset: () => track("password_reset"),

  checkoutStarted: (plan: string) => track("checkout_started", { plan }),
  checkoutCompleted: (plan: string) => track("checkout_completed", { plan }),
  cancelSubscription: () => track("cancel_subscription"),
};

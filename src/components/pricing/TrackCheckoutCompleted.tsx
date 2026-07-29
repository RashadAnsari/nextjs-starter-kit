"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";
import { DEFAULT_PLAN_ID } from "@/lib/payment/plans";

/**
 * Fires the checkout_completed event once, when the customer lands back on the
 * success page. Its counterpart checkout_started is sent from CheckoutButton;
 * without this the funnel has a start and no end and the conversion rate cannot
 * be measured.
 *
 * This is an analytics signal only. Access is granted by the signed webhook,
 * never by anything that happens on this page.
 */
export function TrackCheckoutCompleted() {
  useEffect(() => {
    analytics.checkoutCompleted(DEFAULT_PLAN_ID);
  }, []);

  return null;
}

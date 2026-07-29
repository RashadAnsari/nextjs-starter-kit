"use client";

import { useEffect } from "react";
import { initializePaddle, CheckoutEventNames } from "@paddle/paddle-js";

interface Props {
  token: string;
  environment: "production" | "sandbox";
}

/**
 * Boots Paddle.js, which finds the `_ptxn` in the URL and opens the checkout
 * overlay for that transaction. It renders nothing: the overlay is Paddle's own
 * iframe, allowed by the frame-src and script-src entries in next.config.ts.
 */
export function PaddleInitializer({ token, environment }: Props) {
  useEffect(() => {
    initializePaddle({
      environment,
      token,
      checkout: {
        settings: {
          variant: "one-page",
          displayMode: "overlay",
          // The customer is already signed in to this app, so letting them
          // switch account inside the overlay would detach the subscription
          // from the user id passed in customData.
          allowLogout: false,
          successUrl: `${window.location.origin}/payment/success`,

          // Everything below is a product decision, deliberately left at
          // Paddle's defaults rather than chosen for you. Uncomment what fits:
          //
          // locale: "en",                  // force one language; omitted means Paddle follows the browser
          // showAddTaxId: false,           // hide the business tax ID field, for a consumer product
          // showAddDiscounts: false,       // hide the promo code box if you never run promotions
          // allowDiscountRemoval: false,   // stop a customer clearing a discount you applied
          // allowedPaymentMethods: [...],  // restrict methods; leave unset to offer everything
          //                                // Paddle supports for the customer's country
        },
      },
      eventCallback(event) {
        // Closing the overlay leaves an otherwise blank page, so send the
        // customer back to where they started rather than stranding them.
        if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
          window.location.href = "/pricing";
        }
      },
    });
  }, [token, environment]);

  return null;
}

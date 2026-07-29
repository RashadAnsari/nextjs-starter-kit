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
          allowLogout: false,
          successUrl: `${window.location.origin}/payment/success`,
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

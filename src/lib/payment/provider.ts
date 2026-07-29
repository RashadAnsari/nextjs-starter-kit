import type { PaymentProvider } from "./types";
import { PaddleProvider } from "./paddle";

/** The provider configured for this deployment. Throws when billing is off. */
export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "paddle":
      return new PaddleProvider();
    default:
      throw new Error("No payment provider configured. Set PAYMENT_PROVIDER in your environment.");
  }
}

/**
 * Resolve a provider by name rather than by configuration. The webhook handler
 * and payment history need this: a subscription created under one provider must
 * stay serviceable after PAYMENT_PROVIDER changes.
 */
export function getPaymentProviderByName(name: string): PaymentProvider | null {
  switch (name) {
    case "paddle":
      return new PaddleProvider();
    default:
      return null;
  }
}

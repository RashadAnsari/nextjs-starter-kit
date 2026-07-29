import type { PlanId } from "./plans";

export interface CheckoutParams {
  userId: string;
  userEmail: string;
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
  /** Customer ID already on file at this provider, if any. */
  existingCustomerId?: string;
  /**
   * When true, use the price without a free trial. Set for returning customers
   * who have subscribed before, so they cannot claim the trial a second time.
   */
  skipTrial?: boolean;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  /** Customer ID created or used during checkout: persist in payment_customers. */
  customerId: string;
}

export interface WebhookEvent {
  type:
    | "subscription.activated"
    | "subscription.renewed"
    | "subscription.cancelled"
    | "subscription.expired"
    | "subscription.refunded"
    | "payment.failed";
  /** Internal user ID, used by the webhook handler to upsert the subscriptions row. */
  userId: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  planId: PlanId;
  status: "trialing" | "active" | "cancelled" | "past_due" | "expired";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface ProviderPayment {
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  paidAt: Date | null;
  description: string;
}

/**
 * What the app needs from a billing provider. Implement this interface to add
 * Stripe, Lemon Squeezy, or anything else, then register it in provider.ts:
 * nothing outside src/lib/payment/ knows which provider is in use.
 */
export interface PaymentProvider {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  /**
   * Parse and verify a raw webhook payload from the provider. Returns a
   * normalised WebhookEvent on success, null when the payload is valid but
   * needs no subscription update, and throws on an invalid payload.
   */
  parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null>;
  /**
   * Cancel an active subscription at the provider side. providerCustomerId is
   * required for providers that scope subscriptions under customers.
   */
  cancelSubscription(
    providerSubscriptionId: string,
    providerCustomerId: string | null,
    immediately?: boolean
  ): Promise<void>;
  getPaymentHistory(providerCustomerId: string): Promise<ProviderPayment[]>;
}

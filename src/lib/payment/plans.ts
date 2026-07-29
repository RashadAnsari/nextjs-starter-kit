/**
 * Plan definitions and the pure access rules built on them.
 *
 * This module deliberately imports nothing: client components need PLAN_LABEL
 * and the UserSubscription type, and importing them from subscription.ts would
 * drag the `pg` connection pool into the browser bundle.
 */

export type PlanId = "monthly";
export type SubscriptionStatus = "trialing" | "active" | "cancelled" | "past_due" | "expired";

/**
 * Every plan the app offers. Add new plan ids here and to the check constraint
 * on subscriptions.plan_id in the migration, then add a card in PricingCards.
 */
export const PLAN_IDS: readonly PlanId[] = ["monthly"];
export const DEFAULT_PLAN_ID: PlanId = "monthly";

/** What the paid plan is called in the UI and in provider-side descriptions. */
export const PLAN_LABEL = "Monthly";

/**
 * Months of free access granted to a new user while no payment provider is
 * configured, so the app is usable end to end before you set up billing.
 * See grantComplimentaryAccess in subscription.ts.
 */
export const COMPLIMENTARY_ACCESS_MONTHS = 3;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export interface UserSubscription {
  planId: PlanId | null; // null = no subscription row (never subscribed)
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  paymentProvider: string | null;
}

export const NO_SUBSCRIPTION: UserSubscription = {
  planId: null,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  providerSubscriptionId: null,
  providerCustomerId: null,
  paymentProvider: null,
};

/**
 * Whether the user may access paid features. This is the single gate: call it
 * from every server route and page that serves paid content.
 *
 * Manually granted subscriptions (no payment provider, e.g. from
 * scripts/grant-subscription.ts) have no provider to update their status when
 * the period ends, so current_period_end is the sole authority: access lasts
 * only until that date.
 *
 * For provider-backed subscriptions we trust the status, which the provider
 * keeps in sync via webhooks:
 * - trialing, active: allow
 * - past_due: allow, the provider is still retrying payment; revoke on expiry
 * - cancelled but still inside the paid period: allow, the user paid through it
 * - expired, or no subscription at all: deny
 *
 * current_period_end is deliberately NOT enforced for an active provider-backed
 * subscription: that would falsely deny access during the renewal window, after
 * the period ends but before the renewal webhook arrives. A trial cancelled
 * immediately has current_period_end set to now, so it falls through to denied.
 */
export function hasPremiumAccess(sub: UserSubscription): boolean {
  if (sub.planId === null) {
    return false;
  }

  // Manually granted (no payment provider): the period end is the only authority.
  if (!sub.paymentProvider) {
    return !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date();
  }

  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    return true;
  }

  if (sub.status === "cancelled" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) {
    return true;
  }

  return false;
}

/**
 * Whether the user is eligible for the free trial. Only users who have never
 * subscribed (no subscription row) get one; anyone who has subscribed or
 * trialed before is billed immediately at checkout.
 */
export function isTrialEligible(sub: UserSubscription): boolean {
  return sub.planId === null;
}

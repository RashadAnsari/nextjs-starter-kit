import "server-only";
import { pool } from "@/lib/db";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { SubscriptionEventRepository } from "@/lib/repositories/subscriptionEventRepository";
import {
  COMPLIMENTARY_ACCESS_MONTHS,
  DEFAULT_PLAN_ID,
  NO_SUBSCRIPTION,
  type PlanId,
  type SubscriptionStatus,
  type UserSubscription,
} from "./plans";

/**
 * The database side of subscriptions. Everything here touches Postgres, so it
 * is server-only: import plan constants, types, and the access rules from
 * ./plans instead, which is safe in client components.
 */

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const repo = new SubscriptionRepository(pool);
  const data = await repo.findByUserId(userId);

  if (!data) {
    return NO_SUBSCRIPTION;
  }

  return {
    planId: data.plan_id as PlanId,
    status: data.status as SubscriptionStatus,
    currentPeriodEnd: new Date(data.current_period_end),
    cancelAtPeriodEnd: data.cancel_at_period_end,
    providerSubscriptionId: data.provider_subscription_id,
    providerCustomerId: data.provider_customer_id,
    paymentProvider: data.payment_provider,
  };
}

/**
 * While no payment provider is configured, give a brand new user
 * COMPLIMENTARY_ACCESS_MONTHS of free access. Creates a provider-less
 * subscription row (the same shape grant-subscription.ts produces), so
 * hasPremiumAccess grants access purely on current_period_end.
 *
 * Idempotent: the unique index on subscriptions.user_id means a user who
 * already has a row keeps it and is not re-granted. Returns whether a row was
 * newly created, which the caller uses to show a welcome message once.
 */
export async function grantComplimentaryAccess(userId: string): Promise<{ granted: boolean }> {
  // Only complimentary while there is no provider to bill through.
  if (process.env.PAYMENT_PROVIDER) {
    return { granted: false };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + COMPLIMENTARY_ACCESS_MONTHS);

  const { inserted, error } = await new SubscriptionRepository(pool).insertIfAbsent({
    user_id: userId,
    plan_id: DEFAULT_PLAN_ID,
    status: "active",
    payment_provider: null,
    provider_customer_id: null,
    provider_subscription_id: null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  });

  if (error) {
    console.error(
      "[subscription] Failed to grant complimentary access — user=%s error=%o",
      userId,
      error
    );
    return { granted: false };
  }

  // Record the grant in the append-only history (only when newly created).
  if (inserted) {
    await new SubscriptionEventRepository(pool).record({
      user_id: userId,
      event_type: "complimentary_grant",
      plan_id: DEFAULT_PLAN_ID,
      status: "active",
      payment_provider: null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      occurred_at: now.toISOString(),
    });
  }

  return { granted: inserted };
}

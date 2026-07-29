import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { pool } from "@/lib/db";
import { getUserSubscription } from "@/lib/payment/subscription";
import { getPaymentProvider } from "@/lib/payment/provider";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { SubscriptionEventRepository } from "@/lib/repositories/subscriptionEventRepository";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub.planId || (sub.status !== "active" && sub.status !== "trialing")) {
    console.warn("[subscription/cancel] No active subscription to cancel for user=%s", user.id);
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
  }

  // Cancelling during the trial revokes access immediately; cancelling an active
  // paid plan keeps access until the end of the current billing period.
  const cancelImmediately = sub.status === "trialing";

  if (sub.providerSubscriptionId) {
    try {
      const provider = getPaymentProvider();
      await provider.cancelSubscription(
        sub.providerSubscriptionId,
        sub.providerCustomerId,
        cancelImmediately
      );
    } catch (err) {
      console.error("[subscription/cancel] Payment provider error:", err);
      return NextResponse.json({ error: "Failed to cancel with provider" }, { status: 500 });
    }
  }

  const now = new Date().toISOString();
  const update = cancelImmediately
    ? { status: "cancelled", cancel_at_period_end: false, current_period_end: now, updated_at: now }
    : { cancel_at_period_end: true, updated_at: now };

  const { error } = await new SubscriptionRepository(pool).updateByUserId(user.id, update);
  if (error) {
    console.error("[subscription/cancel] db error:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  await new SubscriptionEventRepository(pool).record({
    user_id: user.id,
    event_type: cancelImmediately ? "cancelled" : "cancel_scheduled",
    plan_id: sub.planId,
    status: cancelImmediately ? "cancelled" : sub.status,
    payment_provider: sub.paymentProvider,
    provider_customer_id: sub.providerCustomerId,
    provider_subscription_id: sub.providerSubscriptionId,
    current_period_end: cancelImmediately ? now : (sub.currentPeriodEnd?.toISOString() ?? null),
    cancel_at_period_end: !cancelImmediately,
    occurred_at: now,
  });

  return NextResponse.json({ ok: true });
}

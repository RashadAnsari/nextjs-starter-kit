import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { pool } from "@/lib/db";
import { getUserSubscription } from "@/lib/payment/subscription";
import { hasPremiumAccess, isTrialEligible, isPlanId, DEFAULT_PLAN_ID } from "@/lib/payment/plans";
import { getPaymentProvider } from "@/lib/payment/provider";
import { PaymentCustomerRepository } from "@/lib/repositories/paymentCustomerRepository";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = body?.planId ?? DEFAULT_PLAN_ID;
  if (!isPlanId(planId)) {
    console.warn("[checkout] Invalid planId in request — user=%s planId=%s", user.id, body?.planId);
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const currentSubscription = await getUserSubscription(user.id);
  if (hasPremiumAccess(currentSubscription)) {
    console.warn("[checkout] User already has access — user=%s", user.id);
    return NextResponse.json({ error: "You already have an active subscription" }, { status: 400 });
  }

  // Users who have subscribed or trialed before are not eligible again.
  const skipTrial = !isTrialEligible(currentSubscription);

  const providerName = process.env.PAYMENT_PROVIDER;
  if (!providerName) {
    console.error("[checkout] No payment provider configured");
    return NextResponse.json({ error: "No payment provider configured" }, { status: 503 });
  }

  const origin = req.nextUrl.origin;
  const paymentCustomers = new PaymentCustomerRepository(pool);
  const existingCustomer = await paymentCustomers.findByUserAndProvider(user.id, providerName);

  try {
    const provider = getPaymentProvider();
    const result = await provider.createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? "",
      planId,
      successUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/cancel`,
      existingCustomerId: existingCustomer?.customer_id,
      skipTrial,
    });

    if (result.customerId && !existingCustomer) {
      await paymentCustomers.create({
        user_id: user.id,
        provider: providerName,
        customer_id: result.customerId,
      });
    }

    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (err) {
    console.error("[checkout] Payment provider error:", err);
    return NextResponse.json({ error: "Payment provider error" }, { status: 500 });
  }
}

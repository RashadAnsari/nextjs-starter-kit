import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getPaymentProviderByName } from "@/lib/payment/provider";
import type { WebhookEvent } from "@/lib/payment/types";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { SubscriptionEventRepository } from "@/lib/repositories/subscriptionEventRepository";
import { ProcessedWebhookRepository } from "@/lib/repositories/processedWebhookRepository";

/** JSON-safe snapshot of a webhook event for the history's raw_event column. */
function serializeEvent(event: WebhookEvent) {
  return {
    ...event,
    currentPeriodStart: event.currentPeriodStart.toISOString(),
    currentPeriodEnd: event.currentPeriodEnd.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  // Read the body as text, never as JSON: signature verification runs over the
  // exact bytes the provider signed.
  const rawBody = await req.text();

  // Which provider sent this is decided by the signature header, not by
  // PAYMENT_PROVIDER, so events for an older provider still process correctly.
  const paddleSignature = req.headers.get("paddle-signature");
  if (!paddleSignature) {
    console.error("[webhook] No signature header found");
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  const providerName = "paddle";

  const provider = getPaymentProviderByName(providerName);
  if (!provider) {
    console.error("[webhook] No provider found for name:", providerName);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  let event;
  try {
    event = await provider.parseWebhook(rawBody, paddleSignature);
  } catch (err) {
    console.error("[webhook] Failed to parse event:", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (!event) {
    console.info("[webhook] no-op event received, returning OK");
    return NextResponse.json({ ok: true });
  }

  const subscriptions = new SubscriptionRepository(pool);
  const events = new SubscriptionEventRepository(pool);
  const processed = new ProcessedWebhookRepository(pool);
  const now = new Date().toISOString();

  // Idempotency guard: the key is a hash of the raw, signature-verified body, so
  // a provider retry or a replayed captured request is processed only once. This
  // stops a replayed older event from resurrecting or extending access.
  const eventKey = createHash("sha256").update(rawBody).digest("hex");
  if (await processed.isProcessed(eventKey)) {
    console.info("[webhook] Duplicate event ignored type=%s", event.type);
    return NextResponse.json({ ok: true });
  }

  try {
    if (event.type === "subscription.refunded") {
      const sub = await subscriptions.findByProviderSubscriptionId(event.providerSubscriptionId);

      if (!sub) {
        console.warn(
          "[webhook] Refund for unknown subscriptionId=%s, skipping",
          event.providerSubscriptionId
        );
        await processed.markProcessed(eventKey, event.type);
        return NextResponse.json({ ok: true });
      }

      if (sub.status === "active" || sub.status === "past_due") {
        await provider.cancelSubscription(
          event.providerSubscriptionId,
          event.providerCustomerId,
          true
        );
      }

      // Use the owner resolved from the subscription, not event.userId, which is
      // empty for refund/adjustment events (the audit trail must name the user).
      await events.record({
        user_id: sub.user_id,
        event_type: event.type,
        payment_provider: providerName,
        provider_customer_id: event.providerCustomerId,
        provider_subscription_id: event.providerSubscriptionId,
        occurred_at: now,
        raw_event: serializeEvent(event),
      });

      await processed.markProcessed(eventKey, event.type);
      console.info(
        "[webhook] Refund processed, subscription cancelled for subscriptionId=%s",
        event.providerSubscriptionId
      );
      return NextResponse.json({ ok: true });
    }

    if (event.type === "payment.failed") {
      // Only update the status: do not overwrite the period dates.
      await subscriptions.updateByUserId(event.userId, { status: "past_due", updated_at: now });
    } else {
      await subscriptions.upsert({
        user_id: event.userId,
        plan_id: event.planId,
        status: event.status,
        payment_provider: providerName,
        provider_customer_id: event.providerCustomerId,
        provider_subscription_id: event.providerSubscriptionId,
        current_period_start: event.currentPeriodStart.toISOString(),
        current_period_end: event.currentPeriodEnd.toISOString(),
        cancel_at_period_end: event.cancelAtPeriodEnd,
        updated_at: now,
      });
    }

    await events.record({
      user_id: event.userId,
      event_type: event.type,
      plan_id: event.planId,
      status: event.type === "payment.failed" ? "past_due" : event.status,
      payment_provider: providerName,
      provider_customer_id: event.providerCustomerId,
      provider_subscription_id: event.providerSubscriptionId,
      current_period_start: event.currentPeriodStart.toISOString(),
      current_period_end: event.currentPeriodEnd.toISOString(),
      cancel_at_period_end: event.cancelAtPeriodEnd,
      occurred_at: now,
      raw_event: serializeEvent(event),
    });
  } catch (err) {
    console.error("[webhook] DB error:", err);
    // Return 500 so the provider retries. The event is not marked processed, so
    // the retry is reprocessed rather than deduped away.
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  await processed.markProcessed(eventKey, event.type);
  console.info("[webhook] Processed type=%s userId=%s", event.type, event.userId);
  return NextResponse.json({ ok: true });
}

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getPaymentProviderByName } from "@/lib/payment/provider";
import type { WebhookEvent } from "@/lib/payment/types";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { SubscriptionEventRepository } from "@/lib/repositories/subscriptionEventRepository";
import { ProcessedWebhookRepository } from "@/lib/repositories/processedWebhookRepository";

/**
 * Which provider sent a webhook is decided by its signature header rather than
 * by PAYMENT_PROVIDER, so events for a provider you have since migrated away
 * from keep processing correctly instead of being rejected.
 *
 * This is the one place outside src/lib/payment/ that names a provider. Adding
 * one means a line here as well as a case in getPaymentProviderByName.
 */
const SIGNATURE_HEADERS = [
  { header: "paddle-signature", provider: "paddle" },
  // { header: "stripe-signature", provider: "stripe" },
] as const;

/** The provider that signed this request, and the signature it sent. */
function detectProvider(req: NextRequest) {
  for (const { header, provider } of SIGNATURE_HEADERS) {
    const signature = req.headers.get(header);
    if (signature) {
      return { providerName: provider, signature };
    }
  }
  return null;
}

/** JSON-safe snapshot of a webhook event for the history's raw_event column. */
function serializeEvent(event: WebhookEvent) {
  return {
    ...event,
    currentPeriodStart: event.currentPeriodStart.toISOString(),
    currentPeriodEnd: event.currentPeriodEnd.toISOString(),
    occurredAt: event.occurredAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  // Read the body as text, never as JSON: signature verification runs over the
  // exact bytes the provider signed.
  const rawBody = await req.text();

  const detected = detectProvider(req);
  if (!detected) {
    console.error("[webhook] No known signature header found");
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  const { providerName, signature } = detected;

  // Constructing a provider reads its credentials and throws when they are
  // missing, which is the normal state of a deployment that has not configured
  // billing yet. Both that and an unregistered name answer 400 rather than 500,
  // because neither is transient and a 500 would have the provider retrying a
  // configuration error indefinitely.
  let provider;
  try {
    provider = getPaymentProviderByName(providerName);
  } catch (err) {
    console.error("[webhook] Provider %s is not configured:", providerName, err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  if (!provider) {
    console.error("[webhook] No provider registered for name:", providerName);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  let event;
  try {
    event = await provider.parseWebhook(rawBody, signature);
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
  const occurredAt = event.occurredAt.toISOString();

  // Idempotency guard: the key is a hash of the raw, signature-verified body, so
  // a provider retry or a replayed captured request is processed only once. This
  // stops a replayed older event from resurrecting or extending access.
  //
  // The key is claimed atomically before processing, so two concurrent
  // deliveries of the same event cannot both run the side effects. Every
  // failure path releases the claim so the provider retry is reprocessed; the
  // remaining trade-off is a hard crash mid-processing, which leaves the event
  // claimed and its retries deduped away.
  const eventKey = createHash("sha256").update(rawBody).digest("hex");
  if (!(await processed.claim(eventKey, event.type))) {
    console.info("[webhook] Duplicate event ignored type=%s", event.type);
    return NextResponse.json({ ok: true });
  }

  /** Answer 500 after releasing the claim, so the provider retry reprocesses. */
  const fail = async () => {
    await processed.release(eventKey);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  };

  try {
    if (event.type === "subscription.refunded") {
      const sub = await subscriptions.findByProviderSubscriptionId(event.providerSubscriptionId);

      if (!sub) {
        console.warn(
          "[webhook] Refund for unknown subscriptionId=%s, skipping",
          event.providerSubscriptionId
        );
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
      const recorded = await events.record({
        user_id: sub.user_id,
        event_type: event.type,
        payment_provider: providerName,
        provider_customer_id: event.providerCustomerId,
        provider_subscription_id: event.providerSubscriptionId,
        occurred_at: occurredAt,
        raw_event: serializeEvent(event),
      });
      if (recorded.error) {
        // record() logged the failure; retry to write the missing audit row.
        return fail();
      }

      console.info(
        "[webhook] Refund processed, subscription cancelled for subscriptionId=%s",
        event.providerSubscriptionId
      );
      return NextResponse.json({ ok: true });
    }

    // Repository writes never throw: runWrite converts driver errors into the
    // returned { error } shape, so each result must be checked explicitly. A
    // swallowed failure here would answer 200 and lose the state change for
    // good, e.g. a paying customer who never receives access.
    //
    // Both writes carry the provider's event time and are skipped when a newer
    // event has already been applied: deliveries are retried and not ordered,
    // so a delayed older event must not overwrite newer state. Skipped events
    // are still recorded in the history below.
    if (event.type === "payment.failed") {
      // Only update the status: do not overwrite the period dates.
      const { applied, error } = await subscriptions.markPastDue(event.userId, now, occurredAt);
      if (error) {
        console.error(
          "[webhook] Status update failed type=%s user=%s:",
          event.type,
          event.userId,
          error
        );
        return fail();
      }
      if (!applied) {
        console.info(
          "[webhook] Stale or inapplicable payment.failed skipped user=%s",
          event.userId
        );
      }
    } else {
      const { applied, error } = await subscriptions.applyProviderEvent(
        {
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
        },
        occurredAt
      );
      if (error) {
        console.error("[webhook] Upsert failed type=%s user=%s:", event.type, event.userId, error);
        return fail();
      }
      if (!applied) {
        console.info("[webhook] Stale event skipped type=%s user=%s", event.type, event.userId);
      }
    }

    const recorded = await events.record({
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
      occurred_at: occurredAt,
      raw_event: serializeEvent(event),
    });
    if (recorded.error) {
      // record() logged the failure; retry to write the missing audit row.
      return fail();
    }
  } catch (err) {
    // Reached by the calls that do throw: the subscription lookup and the
    // provider cancel API on the refund path.
    console.error("[webhook] Processing failed type=%s:", event.type, err);
    return fail();
  }

  console.info("[webhook] Processed type=%s userId=%s", event.type, event.userId);
  return NextResponse.json({ ok: true });
}

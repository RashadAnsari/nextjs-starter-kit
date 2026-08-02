import "server-only";
import {
  Paddle,
  Environment,
  EventName,
  type AdjustmentCreatedEvent,
  type AdjustmentUpdatedEvent,
} from "@paddle/paddle-node-sdk";
import { site } from "@/config/site";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
  ProviderPayment,
  WebhookEvent,
} from "./types";
import { DEFAULT_PLAN_ID, isPlanId, PLAN_LABEL, type PlanId } from "./plans";

function planIdFromCustomData(customData: Record<string, string> | null): PlanId {
  return isPlanId(customData?.planId) ? customData.planId : DEFAULT_PLAN_ID;
}

const PLAN_DESCRIPTION = `${site.name} ${PLAN_LABEL}`;

function getClient(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set");
  }

  const environment =
    process.env.NODE_ENV === "production" ? Environment.production : Environment.sandbox;
  return new Paddle(apiKey, { environment });
}

function getPriceId(skipTrial: boolean): string {
  // Returning customers use the no-trial price so they are charged immediately
  // instead of receiving a second free trial.
  const envVar = skipTrial ? "PADDLE_PRICE_ID_MONTHLY_NO_TRIAL" : "PADDLE_PRICE_ID_MONTHLY";
  const id = process.env[envVar];
  if (!id) {
    throw new Error(`${envVar} is not set`);
  }
  return id;
}

export class PaddleProvider implements PaymentProvider {
  private readonly client = getClient();

  async createCheckoutSession({
    userId,
    userEmail,
    planId,
    existingCustomerId,
    skipTrial = false,
  }: CheckoutParams): Promise<CheckoutResult> {
    const priceId = getPriceId(skipTrial);

    let customerId = existingCustomerId;
    if (!customerId) {
      // Look for an existing Paddle customer with this email before creating
      // one. Guards against duplicates when the payment_customers row is absent,
      // e.g. after an account is deleted and the same email signs up again.
      for await (const existing of this.client.customers.list({ email: [userEmail] })) {
        customerId = existing.id;
        break;
      }

      if (!customerId) {
        const customer = await this.client.customers.create({
          email: userEmail,
          customData: { userId },
        });
        customerId = customer.id;
      }
    }

    const transaction = await this.client.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customerId,
      // customData is how the user id survives the round trip: every webhook
      // for this subscription carries it back, which is what lets the handler
      // map a provider event to a row in our own database.
      customData: { userId, planId },
    });

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      throw new Error("Paddle did not return a checkout URL");
    }

    return { checkoutUrl, sessionId: transaction.id, customerId };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null> {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("PADDLE_WEBHOOK_SECRET is not set");
    }
    if (!signature) {
      throw new Error("Missing Paddle-Signature header");
    }

    const event = await this.client.webhooks.unmarshal(rawBody, secret, signature);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated: {
        const sub = event.data;
        const customData = sub.customData as Record<string, string> | null;
        const userId = customData?.userId;
        if (!userId) {
          return null;
        }

        return {
          type: "subscription.activated",
          userId,
          providerCustomerId: sub.customerId,
          providerSubscriptionId: sub.id,
          planId: planIdFromCustomData(customData),
          status: sub.status === "trialing" ? "trialing" : "active",
          currentPeriodStart: new Date(sub.currentBillingPeriod?.startsAt ?? new Date()),
          currentPeriodEnd: new Date(sub.currentBillingPeriod?.endsAt ?? new Date()),
          cancelAtPeriodEnd: sub.scheduledChange?.action === "cancel",
          occurredAt: new Date(event.occurredAt),
        };
      }

      case EventName.SubscriptionUpdated: {
        const sub = event.data;
        const customData = sub.customData as Record<string, string> | null;
        const userId = customData?.userId;
        if (!userId) {
          return null;
        }

        const periodStart = new Date(sub.currentBillingPeriod?.startsAt ?? new Date());
        const periodEnd = new Date(sub.currentBillingPeriod?.endsAt ?? new Date());

        if (sub.status === "canceled") {
          // Access ends when the cancellation actually takes effect: now for an
          // immediately-cancelled trial, the period boundary for a scheduled one.
          const cancelEnd = sub.canceledAt ? new Date(sub.canceledAt) : periodEnd;
          return {
            type: "subscription.cancelled",
            userId,
            providerCustomerId: sub.customerId,
            providerSubscriptionId: sub.id,
            planId: planIdFromCustomData(customData),
            status: "cancelled",
            currentPeriodStart: periodStart,
            currentPeriodEnd: cancelEnd,
            cancelAtPeriodEnd: false,
            occurredAt: new Date(event.occurredAt),
          };
        }

        if (sub.status === "past_due") {
          return {
            type: "payment.failed",
            userId,
            providerCustomerId: sub.customerId,
            providerSubscriptionId: sub.id,
            planId: planIdFromCustomData(customData),
            status: "past_due",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            occurredAt: new Date(event.occurredAt),
          };
        }

        if (sub.status === "active" || sub.status === "trialing") {
          return {
            type: "subscription.renewed",
            userId,
            providerCustomerId: sub.customerId,
            providerSubscriptionId: sub.id,
            planId: planIdFromCustomData(customData),
            status: sub.status === "trialing" ? "trialing" : "active",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.scheduledChange?.action === "cancel",
            occurredAt: new Date(event.occurredAt),
          };
        }

        return null;
      }

      case EventName.SubscriptionCanceled: {
        const sub = event.data;
        const customData = sub.customData as Record<string, string> | null;
        const userId = customData?.userId;
        if (!userId) {
          return null;
        }

        return {
          type: "subscription.cancelled",
          userId,
          providerCustomerId: sub.customerId,
          providerSubscriptionId: sub.id,
          planId: planIdFromCustomData(customData),
          status: "cancelled",
          currentPeriodStart: new Date(sub.currentBillingPeriod?.startsAt ?? new Date()),
          currentPeriodEnd: new Date(
            sub.canceledAt ?? sub.currentBillingPeriod?.endsAt ?? new Date()
          ),
          cancelAtPeriodEnd: false,
          occurredAt: new Date(event.occurredAt),
        };
      }

      case EventName.SubscriptionPastDue: {
        const sub = event.data;
        const customData = sub.customData as Record<string, string> | null;
        const userId = customData?.userId;
        if (!userId) {
          return null;
        }

        return {
          type: "payment.failed",
          userId,
          providerCustomerId: sub.customerId,
          providerSubscriptionId: sub.id,
          planId: planIdFromCustomData(customData),
          status: "past_due",
          currentPeriodStart: new Date(sub.currentBillingPeriod?.startsAt ?? new Date()),
          currentPeriodEnd: new Date(sub.currentBillingPeriod?.endsAt ?? new Date()),
          cancelAtPeriodEnd: false,
          occurredAt: new Date(event.occurredAt),
        };
      }

      case EventName.TransactionPaymentFailed: {
        const tx = event.data;
        const customData = tx.customData as Record<string, string> | null;
        const userId = customData?.userId;
        if (!userId) {
          return null;
        }

        return {
          type: "payment.failed",
          userId,
          providerCustomerId: tx.customerId ?? "",
          providerSubscriptionId: tx.subscriptionId ?? "",
          planId: planIdFromCustomData(customData),
          status: "past_due",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          occurredAt: new Date(event.occurredAt),
        };
      }

      case EventName.AdjustmentCreated:
      case EventName.AdjustmentUpdated: {
        const adj = (event as AdjustmentCreatedEvent | AdjustmentUpdatedEvent).data;
        const isRefund = adj.action === "refund" || adj.action === "chargeback";
        if (!isRefund || adj.status !== "approved" || !adj.subscriptionId) {
          return null;
        }

        // Adjustments carry no customData, so there is no user id here. The
        // webhook handler resolves the owner from the subscription id instead.
        return {
          type: "subscription.refunded",
          userId: "",
          providerCustomerId: adj.customerId,
          providerSubscriptionId: adj.subscriptionId,
          planId: DEFAULT_PLAN_ID,
          status: "cancelled",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          occurredAt: new Date(event.occurredAt),
        };
      }

      default:
        return null;
    }
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    _providerCustomerId: string | null,
    immediately = false
  ): Promise<void> {
    await this.client.subscriptions.cancel(providerSubscriptionId, {
      effectiveFrom: immediately ? "immediately" : "next_billing_period",
    });
  }

  async archiveCustomer(providerCustomerId: string): Promise<void> {
    // Paddle has no customer delete: archiving is the documented equivalent,
    // and it keeps the customer out of future checkouts and customer lists.
    await this.client.customers.archive(providerCustomerId);
  }

  async getPaymentHistory(providerCustomerId: string): Promise<ProviderPayment[]> {
    const refundedTransactionIds = new Set<string>();
    for await (const adj of this.client.adjustments.list({
      customerId: [providerCustomerId],
      action: "refund",
      status: ["approved"],
    })) {
      refundedTransactionIds.add(adj.transactionId);
    }

    const payments: ProviderPayment[] = [];
    for await (const tx of this.client.transactions.list({
      customerId: [providerCustomerId],
      status: ["completed"],
    })) {
      const total = tx.details?.totals?.total;
      if (!total) {
        continue;
      }

      payments.push({
        providerPaymentId: tx.id,
        amountCents: Math.round(parseFloat(total)),
        currency: tx.currencyCode,
        status: refundedTransactionIds.has(tx.id) ? "refunded" : "paid",
        paidAt: tx.billedAt ? new Date(tx.billedAt) : null,
        description: tx.items[0]?.price?.description ?? PLAN_DESCRIPTION,
      });
    }
    return payments;
  }
}

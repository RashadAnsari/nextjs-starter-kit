import { beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";
import type { PaymentProvider, WebhookEvent } from "@/lib/payment/types";
import { StubPool } from "../../../../../test/stubPool";

/**
 * Route-level tests with a scripted pool and a fake provider. They pin the
 * control flow that guards paid access: repository write failures must answer
 * 500 and release the idempotency claim, duplicates must be ignored, and the
 * refund path must cancel at the provider. SQL semantics (the conditional
 * upsert, the claim insert) live in Postgres and are not provable here.
 */

const CLAIM = /insert into processed_webhook_events/;
const RELEASE = /delete from processed_webhook_events/;
const APPLY = /insert into subscriptions/;
const PAST_DUE = /update subscriptions/;
const RECORD = /insert into subscription_events/;
const FIND_BY_PROVIDER_SUB = /select user_id, status, payment_provider from subscriptions/;

const stubPool = new StubPool();

let parsedEvent: WebhookEvent | null = null;
let cancelCalls: unknown[][] = [];

const fakeProvider: PaymentProvider = {
  createCheckoutSession: () => Promise.reject(new Error("unused in webhook tests")),
  parseWebhook: () => Promise.resolve(parsedEvent),
  cancelSubscription: (...args) => {
    cancelCalls.push(args);
    return Promise.resolve();
  },
  getPaymentHistory: () => Promise.resolve([]),
};

mock.module("@/lib/db", () => ({ pool: stubPool }));
mock.module("@/lib/payment/provider", () => ({
  getPaymentProvider: () => fakeProvider,
  getPaymentProviderByName: () => fakeProvider,
}));

const { POST } = await import("./route");

function activationEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    type: "subscription.activated",
    userId: "user_1",
    providerCustomerId: "ctm_1",
    providerSubscriptionId: "sub_1",
    planId: "monthly",
    status: "active",
    currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    occurredAt: new Date("2026-07-30T12:00:00Z"),
    ...overrides,
  };
}

let bodyCounter = 0;

function webhookRequest({ signed = true }: { signed?: boolean } = {}) {
  bodyCounter += 1;
  return new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    body: JSON.stringify({ test: bodyCounter }),
    headers: signed ? { "paddle-signature": "sig" } : {},
  });
}

beforeEach(() => {
  stubPool.reset();
  parsedEvent = activationEvent();
  cancelCalls = [];
});

describe("POST /api/payments/webhook", () => {
  test("rejects a request without a known signature header", async () => {
    const res = await POST(webhookRequest({ signed: false }));
    expect(res.status).toBe(400);
    expect(stubPool.calls).toHaveLength(0);
  });

  test("applies a subscription event and records history", async () => {
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(stubPool.matched(CLAIM)).toHaveLength(1);
    expect(stubPool.matched(APPLY)).toHaveLength(1);
    expect(stubPool.matched(RECORD)).toHaveLength(1);
    expect(stubPool.matched(RELEASE)).toHaveLength(0);
  });

  test("ignores a duplicate delivery after the claim loses", async () => {
    stubPool.on(CLAIM, () => ({ rowCount: 0, rows: [] }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(stubPool.matched(APPLY)).toHaveLength(0);
    expect(stubPool.matched(RECORD)).toHaveLength(0);
  });

  test("answers 500 and releases the claim when the snapshot write fails", async () => {
    stubPool.on(APPLY, () => new Error("connection refused"));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(500);
    expect(stubPool.matched(RELEASE)).toHaveLength(1);
    expect(stubPool.matched(RECORD)).toHaveLength(0);
  });

  test("answers 500 and releases the claim when the history write fails", async () => {
    stubPool.on(RECORD, () => new Error("connection refused"));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(500);
    expect(stubPool.matched(RELEASE)).toHaveLength(1);
  });

  test("still records history when a stale event is skipped", async () => {
    stubPool.on(APPLY, () => ({ rowCount: 0, rows: [] }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(stubPool.matched(RECORD)).toHaveLength(1);
    expect(stubPool.matched(RELEASE)).toHaveLength(0);
  });

  test("routes payment.failed through the guarded status update", async () => {
    parsedEvent = activationEvent({ type: "payment.failed", status: "past_due" });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(stubPool.matched(PAST_DUE)).toHaveLength(1);
    expect(stubPool.matched(APPLY)).toHaveLength(0);
    expect(stubPool.matched(RECORD)).toHaveLength(1);
  });

  test("cancels at the provider on a refund for an active subscription", async () => {
    parsedEvent = activationEvent({
      type: "subscription.refunded",
      userId: "",
      status: "cancelled",
    });
    stubPool.on(FIND_BY_PROVIDER_SUB, () => ({
      rowCount: 1,
      rows: [{ user_id: "user_1", status: "active", payment_provider: "paddle" }],
    }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(cancelCalls).toEqual([["sub_1", "ctm_1", true]]);
    const recorded = stubPool.matched(RECORD);
    expect(recorded).toHaveLength(1);
    // The audit row must name the owner resolved from the subscription.
    expect(recorded[0].params[0]).toBe("user_1");
  });

  test("acknowledges a refund for an unknown subscription without writing", async () => {
    parsedEvent = activationEvent({
      type: "subscription.refunded",
      userId: "",
      status: "cancelled",
    });
    stubPool.on(FIND_BY_PROVIDER_SUB, () => ({ rowCount: 0, rows: [] }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(cancelCalls).toHaveLength(0);
    expect(stubPool.matched(RECORD)).toHaveLength(0);
  });
});

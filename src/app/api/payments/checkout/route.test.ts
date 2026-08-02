import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";
import type { CheckoutParams, CheckoutResult, PaymentProvider } from "@/lib/payment/types";
import { StubPool } from "../../../../../test/stubPool";

/**
 * The money path into the provider. What matters here is who is allowed to
 * start a checkout and on which price: a returning customer must not be handed
 * a second free trial, and a user who already has access must not be able to
 * buy a second subscription.
 */

const SUBSCRIPTION_SELECT = /select .* from subscriptions/;
const CUSTOMER_SELECT = /select customer_id from payment_customers/;
const CUSTOMER_INSERT = /insert into payment_customers/;

const pool = new StubPool();

let sessionUser: { id: string; email: string } | null = null;
let checkoutCalls: CheckoutParams[] = [];
let checkoutResult: CheckoutResult | Error = {
  checkoutUrl: "https://pay.example/txn_1",
  sessionId: "txn_1",
  customerId: "ctm_1",
};

const fakeProvider: PaymentProvider = {
  createCheckoutSession: (params) => {
    checkoutCalls.push(params);
    return checkoutResult instanceof Error
      ? Promise.reject(checkoutResult)
      : Promise.resolve(checkoutResult);
  },
  parseWebhook: () => Promise.resolve(null),
  cancelSubscription: () => Promise.resolve(),
  getPaymentHistory: () => Promise.resolve([]),
  archiveCustomer: () => Promise.resolve(),
};

mock.module("@/lib/db", () => ({ pool }));
mock.module("@/lib/auth-session", () => ({ getSessionUser: () => Promise.resolve(sessionUser) }));
mock.module("@/lib/payment/provider", () => ({
  getPaymentProvider: () => fakeProvider,
  getPaymentProviderByName: () => fakeProvider,
}));

const { POST } = await import("./route");

const originalProvider = process.env.PAYMENT_PROVIDER;

function checkoutRequest(body: unknown = {}) {
  return new NextRequest("http://localhost/api/payments/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Script the caller's existing subscription row, as getUserSubscription reads it. */
function existingSubscription(row: Record<string, unknown>) {
  pool.on(SUBSCRIPTION_SELECT, () => ({ rowCount: 1, rows: [row] }));
}

const EXPIRED_ROW = {
  plan_id: "monthly",
  status: "expired",
  current_period_end: "2026-01-01T00:00:00.000Z",
  cancel_at_period_end: false,
  provider_subscription_id: "sub_old",
  provider_customer_id: "ctm_1",
  payment_provider: "paddle",
};

beforeEach(() => {
  pool.reset();
  sessionUser = { id: "user_1", email: "user@example.com" };
  checkoutCalls = [];
  checkoutResult = {
    checkoutUrl: "https://pay.example/txn_1",
    sessionId: "txn_1",
    customerId: "ctm_1",
  };
  process.env.PAYMENT_PROVIDER = "paddle";
});

afterAll(() => {
  process.env.PAYMENT_PROVIDER = originalProvider;
});

describe("POST /api/payments/checkout", () => {
  test("rejects an anonymous caller before touching the database", async () => {
    sessionUser = null;
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(401);
    expect(pool.calls).toHaveLength(0);
  });

  test("rejects a plan id the app does not offer", async () => {
    const res = await POST(checkoutRequest({ planId: "enterprise" }));
    expect(res.status).toBe(400);
    expect(checkoutCalls).toHaveLength(0);
  });

  test("refuses a second subscription for a user who already has access", async () => {
    existingSubscription({
      ...EXPIRED_ROW,
      status: "active",
      current_period_end: "2099-01-01T00:00:00.000Z",
    });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(400);
    expect(checkoutCalls).toHaveLength(0);
  });

  test("offers the trial to a user who has never subscribed", async () => {
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    expect(checkoutCalls[0].skipTrial).toBe(false);
  });

  test("skips the trial for a returning customer", async () => {
    // Anyone with a subscription row has had their trial already.
    existingSubscription(EXPIRED_ROW);
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    expect(checkoutCalls[0].skipTrial).toBe(true);
  });

  test("passes the session user id and email, not anything from the body", async () => {
    await POST(checkoutRequest({ userId: "user_2", userEmail: "attacker@example.com" }));
    expect(checkoutCalls[0]).toMatchObject({
      userId: "user_1",
      userEmail: "user@example.com",
    });
  });

  test("reuses a customer id already on file and does not store it again", async () => {
    pool.on(CUSTOMER_SELECT, () => ({ rowCount: 1, rows: [{ customer_id: "ctm_existing" }] }));
    await POST(checkoutRequest());
    expect(checkoutCalls[0].existingCustomerId).toBe("ctm_existing");
    expect(pool.matched(CUSTOMER_INSERT)).toHaveLength(0);
  });

  test("stores a newly created customer id", async () => {
    await POST(checkoutRequest());
    const [insert] = pool.matched(CUSTOMER_INSERT);
    expect(insert.params).toEqual(["user_1", "paddle", "ctm_1"]);
  });

  test("answers 503 when billing is not configured", async () => {
    delete process.env.PAYMENT_PROVIDER;
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(503);
    expect(checkoutCalls).toHaveLength(0);
  });

  test("answers 500 when the provider call fails", async () => {
    checkoutResult = new Error("provider down");
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(500);
    expect(pool.matched(CUSTOMER_INSERT)).toHaveLength(0);
  });
});

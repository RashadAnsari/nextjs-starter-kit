import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { PaymentProvider } from "@/lib/payment/types";
import { StubPool } from "../../../../../../test/stubPool";

/**
 * Cancelling is the one route that takes access away, and the two cases differ
 * in when it ends: a trial is revoked on the spot, a paid plan runs to the end
 * of the period the customer already paid for. Getting that backwards either
 * refunds nothing or gives away a month, so both are pinned here along with
 * the audit row each writes.
 */

const SUBSCRIPTION_SELECT = /select .* from subscriptions/;
const SUBSCRIPTION_UPDATE = /update subscriptions/;
const RECORD = /insert into subscription_events/;

const pool = new StubPool();

let sessionUser: { id: string } | null = null;
let cancelCalls: unknown[][] = [];
let cancelResult: Error | null = null;

const fakeProvider: PaymentProvider = {
  createCheckoutSession: () => Promise.reject(new Error("unused in cancel tests")),
  parseWebhook: () => Promise.resolve(null),
  cancelSubscription: (...args) => {
    cancelCalls.push(args);
    return cancelResult ? Promise.reject(cancelResult) : Promise.resolve();
  },
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

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    plan_id: "monthly",
    status: "active",
    current_period_end: "2099-01-01T00:00:00.000Z",
    cancel_at_period_end: false,
    provider_subscription_id: "sub_1",
    provider_customer_id: "ctm_1",
    payment_provider: "paddle",
    ...overrides,
  };
}

function withSubscription(overrides: Record<string, unknown> = {}) {
  pool.on(SUBSCRIPTION_SELECT, () => ({ rowCount: 1, rows: [subscriptionRow(overrides)] }));
}

/** The column/value pairs of the update, keyed by column name. */
function updatedColumns() {
  const [call] = pool.matched(SUBSCRIPTION_UPDATE);
  const columns = [...call.sql.matchAll(/(\w+) = \$(\d+)/g)]
    .filter(([, column]) => column !== "user_id")
    .map(([, column, index]) => [column, call.params[Number(index) - 1]] as const);
  return Object.fromEntries(columns);
}

beforeEach(() => {
  pool.reset();
  sessionUser = { id: "user_1" };
  cancelCalls = [];
  cancelResult = null;
});

describe("POST /api/payments/subscription/cancel", () => {
  test("rejects an anonymous caller before touching the database", async () => {
    sessionUser = null;
    const res = await POST();
    expect(res.status).toBe(401);
    expect(pool.calls).toHaveLength(0);
  });

  test("refuses when the user never subscribed", async () => {
    const res = await POST();
    expect(res.status).toBe(400);
    expect(cancelCalls).toHaveLength(0);
  });

  test("refuses to cancel an already cancelled subscription", async () => {
    withSubscription({ status: "cancelled" });
    const res = await POST();
    expect(res.status).toBe(400);
    expect(cancelCalls).toHaveLength(0);
    expect(pool.matched(SUBSCRIPTION_UPDATE)).toHaveLength(0);
  });

  test("keeps access to the end of the period for a paid plan", async () => {
    withSubscription({ status: "active" });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(cancelCalls).toEqual([["sub_1", "ctm_1", false]]);

    const update = updatedColumns();
    expect(update.cancel_at_period_end).toBe(true);
    // The period end must survive: the customer paid through it.
    expect(update).not.toHaveProperty("current_period_end");
    expect(update).not.toHaveProperty("status");
  });

  test("revokes access immediately for a trial", async () => {
    withSubscription({ status: "trialing" });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(cancelCalls).toEqual([["sub_1", "ctm_1", true]]);

    const update = updatedColumns();
    expect(update.status).toBe("cancelled");
    expect(update.cancel_at_period_end).toBe(false);
    expect(new Date(update.current_period_end as string).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("records the scheduled cancellation in the audit trail", async () => {
    withSubscription({ status: "active" });
    await POST();
    const [event] = pool.matched(RECORD);
    expect(event.params[0]).toBe("user_1");
    expect(event.params[1]).toBe("cancel_scheduled");
  });

  test("records an immediate cancellation in the audit trail", async () => {
    withSubscription({ status: "trialing" });
    await POST();
    const [event] = pool.matched(RECORD);
    expect(event.params[1]).toBe("cancelled");
  });

  test("leaves the row untouched when the provider refuses", async () => {
    // Cancelling locally after a provider failure would stop access while the
    // customer keeps being billed.
    withSubscription({ status: "active" });
    cancelResult = new Error("provider down");
    const res = await POST();
    expect(res.status).toBe(500);
    expect(pool.matched(SUBSCRIPTION_UPDATE)).toHaveLength(0);
    expect(pool.matched(RECORD)).toHaveLength(0);
  });

  test("answers 500 without an audit row when the update fails", async () => {
    withSubscription({ status: "active" });
    pool.on(SUBSCRIPTION_UPDATE, () => new Error("connection refused"));
    const res = await POST();
    expect(res.status).toBe(500);
    expect(pool.matched(RECORD)).toHaveLength(0);
  });

  test("cancels locally for a manual grant with no provider subscription", async () => {
    withSubscription({ status: "active", provider_subscription_id: null, payment_provider: null });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(cancelCalls).toHaveLength(0);
    expect(pool.matched(SUBSCRIPTION_UPDATE)).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { PaymentProvider, ProviderPayment } from "@/lib/payment/types";
import { StubPool } from "../../../../test/stubPool";

/**
 * Payment history is read live from the provider, so the row scoping the rest
 * of the app gets from a user_id filter has to be re-established here. Two
 * things do it: the customer ids come from the caller's own rows, and payments
 * older than the account are dropped, because the same email may have
 * subscribed under a previous account that owned that provider customer.
 */

const CUSTOMER_LIST = /select provider, customer_id from payment_customers/;

const pool = new StubPool();

let sessionUser: { id: string; createdAt: string } | null = null;
let history: ProviderPayment[] = [];

const fakeProvider: PaymentProvider = {
  createCheckoutSession: () => Promise.reject(new Error("unused in history tests")),
  parseWebhook: () => Promise.resolve(null),
  cancelSubscription: () => Promise.resolve(),
  getPaymentHistory: () => Promise.resolve(history),
  archiveCustomer: () => Promise.resolve(),
};

mock.module("@/lib/db", () => ({ pool }));
mock.module("@/lib/auth-session", () => ({ getSessionUser: () => Promise.resolve(sessionUser) }));
mock.module("@/lib/payment/provider", () => ({
  getPaymentProvider: () => fakeProvider,
  getPaymentProviderByName: () => fakeProvider,
}));

const { GET } = await import("./route");

function payment(overrides: Partial<ProviderPayment> = {}): ProviderPayment {
  return {
    providerPaymentId: "pay_1",
    amountCents: 1000,
    currency: "EUR",
    status: "paid",
    paidAt: new Date("2026-07-01T00:00:00.000Z"),
    description: "Monthly",
    ...overrides,
  };
}

async function paymentsFrom(res: Response) {
  return (await res.json()).payments as { providerPaymentId: string }[];
}

beforeEach(() => {
  pool.reset();
  sessionUser = { id: "user_1", createdAt: "2026-06-01T00:00:00.000Z" };
  history = [];
});

describe("GET /api/payments", () => {
  test("rejects an anonymous caller before touching the database", async () => {
    sessionUser = null;
    const res = await GET();
    expect(res.status).toBe(401);
    expect(pool.calls).toHaveLength(0);
  });

  test("reads customer ids scoped to the caller", async () => {
    await GET();
    expect(pool.matched(CUSTOMER_LIST)[0].params).toEqual(["user_1"]);
  });

  test("hides payments made before the account existed", async () => {
    // The same email may have held this provider customer under an earlier
    // account, whose payments are not this user's to see.
    pool.on(CUSTOMER_LIST, () => ({
      rowCount: 1,
      rows: [{ provider: "paddle", customer_id: "ctm_1" }],
    }));
    history = [
      payment({ providerPaymentId: "before", paidAt: new Date("2026-01-01T00:00:00.000Z") }),
      payment({ providerPaymentId: "after", paidAt: new Date("2026-07-01T00:00:00.000Z") }),
    ];
    expect((await paymentsFrom(await GET())).map((p) => p.providerPaymentId)).toEqual(["after"]);
  });
});

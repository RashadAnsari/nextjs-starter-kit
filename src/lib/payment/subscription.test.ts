import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { StubPool } from "../../../test/stubPool";
import { COMPLIMENTARY_ACCESS_MONTHS } from "./plans";

/**
 * grantComplimentaryAccess hands out paid features for free, so the two guards
 * around it are the whole point: it must go quiet the moment billing is
 * configured, and it must never grant twice to the same user.
 */

const INSERT = /insert into subscriptions/;
const RECORD = /insert into subscription_events/;

const pool = new StubPool();

mock.module("@/lib/db", () => ({ pool }));

const { grantComplimentaryAccess, getUserSubscription } = await import("./subscription");

const originalProvider = process.env.PAYMENT_PROVIDER;

beforeEach(() => {
  pool.reset();
  delete process.env.PAYMENT_PROVIDER;
});

afterAll(() => {
  process.env.PAYMENT_PROVIDER = originalProvider;
});

describe("grantComplimentaryAccess", () => {
  test("does nothing once a payment provider is configured", async () => {
    process.env.PAYMENT_PROVIDER = "paddle";
    expect(await grantComplimentaryAccess("user_1")).toEqual({ granted: false });
    expect(pool.calls).toHaveLength(0);
  });

  test("grants a provider-less row so access rests on the period end", async () => {
    pool.on(INSERT, () => ({ rowCount: 1, rows: [] }));
    expect(await grantComplimentaryAccess("user_1")).toEqual({ granted: true });

    const [insert] = pool.matched(INSERT);
    expect(insert.sql).toContain("on conflict (user_id) do nothing");
    const [userId, planId, status, provider] = insert.params as string[];
    expect(userId).toBe("user_1");
    expect(planId).toBe("monthly");
    expect(status).toBe("active");
    expect(provider).toBeNull();
  });

  test("sets the period end COMPLIMENTARY_ACCESS_MONTHS out", async () => {
    pool.on(INSERT, () => ({ rowCount: 1, rows: [] }));
    await grantComplimentaryAccess("user_1");

    const [insert] = pool.matched(INSERT);
    const start = new Date(insert.params[6] as string);
    const end = new Date(insert.params[7] as string);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    expect(months).toBe(COMPLIMENTARY_ACCESS_MONTHS);
    expect(end.getTime()).toBeGreaterThan(Date.now());
  });

  test("records the grant in the append-only history", async () => {
    pool.on(INSERT, () => ({ rowCount: 1, rows: [] }));
    await grantComplimentaryAccess("user_1");
    const [event] = pool.matched(RECORD);
    expect(event.params[0]).toBe("user_1");
    expect(event.params[1]).toBe("complimentary_grant");
  });

  test("does not re-grant or re-record for a user who already has a row", async () => {
    // The unique index on user_id absorbs the insert, so the existing
    // subscription (which may be a paid one) is left alone.
    pool.on(INSERT, () => ({ rowCount: 0, rows: [] }));
    expect(await grantComplimentaryAccess("user_1")).toEqual({ granted: false });
    expect(pool.matched(RECORD)).toHaveLength(0);
  });

  test("reports no grant when the insert fails", async () => {
    pool.on(INSERT, () => new Error("connection refused"));
    expect(await grantComplimentaryAccess("user_1")).toEqual({ granted: false });
    expect(pool.matched(RECORD)).toHaveLength(0);
  });
});

describe("getUserSubscription", () => {
  test("returns the no-subscription shape when the user has no row", async () => {
    const sub = await getUserSubscription("user_1");
    expect(sub.planId).toBeNull();
    expect(sub.status).toBeNull();
    expect(sub.paymentProvider).toBeNull();
  });

  test("scopes the read to the user id", async () => {
    await getUserSubscription("user_1");
    expect(pool.calls[0].params).toEqual(["user_1"]);
  });

  test("maps a row onto the access-rule shape", async () => {
    pool.on(/select .* from subscriptions/, () => ({
      rowCount: 1,
      rows: [
        {
          plan_id: "monthly",
          status: "active",
          current_period_end: "2099-01-01T00:00:00.000Z",
          cancel_at_period_end: true,
          provider_subscription_id: "sub_1",
          provider_customer_id: "ctm_1",
          payment_provider: "paddle",
        },
      ],
    }));
    expect(await getUserSubscription("user_1")).toEqual({
      planId: "monthly",
      status: "active",
      currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
      cancelAtPeriodEnd: true,
      providerSubscriptionId: "sub_1",
      providerCustomerId: "ctm_1",
      paymentProvider: "paddle",
    });
  });
});

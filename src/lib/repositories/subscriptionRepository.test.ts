import { beforeEach, describe, expect, test } from "bun:test";
import { StubPool } from "../../../test/stubPool";
import { SubscriptionRepository } from "./subscriptionRepository";

/**
 * updateByUserId builds part of its SQL from the caller's object keys, which
 * makes it the one place in the codebase where a query is not entirely bound
 * parameters. These tests pin the allowlist that stands in for binding, and
 * the user_id filter every read of user-owned data has to carry.
 */

const pool = new StubPool();
const repo = new SubscriptionRepository(pool);

beforeEach(() => {
  pool.reset();
});

describe("SubscriptionRepository.updateByUserId", () => {
  test("writes an allowlisted column with a bound value", async () => {
    await repo.updateByUserId("user_1", { status: "cancelled" });
    const [call] = pool.calls;
    expect(call.sql).toContain("set status = $2");
    expect(call.sql).toContain("where user_id = $1");
    expect(call.params).toEqual(["user_1", "cancelled"]);
  });

  test("binds every value when patching several columns", async () => {
    await repo.updateByUserId("user_1", { status: "cancelled", cancel_at_period_end: false });
    const [call] = pool.calls;
    expect(call.sql).toContain("set status = $2, cancel_at_period_end = $3");
    expect(call.params).toEqual(["user_1", "cancelled", false]);
  });

  test("refuses a column that is not on the allowlist", async () => {
    // An injection attempt arrives as an unknown column name, so it fails here
    // rather than reaching the SET clause.
    await expect(
      repo.updateByUserId("user_1", {
        "status = 'active', plan_id": "monthly",
      } as never)
    ).rejects.toThrow(/Refusing to update unknown subscriptions columns/);
    expect(pool.calls).toHaveLength(0);
  });

  test("refuses user_id, which is the filter rather than a writable column", async () => {
    await expect(repo.updateByUserId("user_1", { user_id: "user_2" } as never)).rejects.toThrow(
      /user_id/
    );
    expect(pool.calls).toHaveLength(0);
  });

  test("names every offending column when more than one is unknown", async () => {
    await expect(repo.updateByUserId("user_1", { nope: 1, also_nope: 2 } as never)).rejects.toThrow(
      /nope, also_nope/
    );
  });

  test("runs no query for an empty patch", async () => {
    const { data, error } = await repo.updateByUserId("user_1", {});
    expect(pool.calls).toHaveLength(0);
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  test("reports a driver error instead of throwing", async () => {
    pool.on(/update subscriptions/, () => new Error("connection refused"));
    const { error } = await repo.updateByUserId("user_1", { status: "expired" });
    expect(error).toBeInstanceOf(Error);
  });
});

describe("SubscriptionRepository reads", () => {
  test("findByUserId filters by user id", async () => {
    pool.on(/select .* from subscriptions/, () => ({
      rowCount: 1,
      rows: [{ user_id: "user_1" }],
    }));
    await repo.findByUserId("user_1");
    expect(pool.calls[0].sql).toContain("where user_id = $1");
    expect(pool.calls[0].params).toEqual(["user_1"]);
  });

  test("findByUserId returns null when the user never subscribed", async () => {
    expect(await repo.findByUserId("user_1")).toBeNull();
  });

  test("findByProviderSubscriptionId binds the provider id", async () => {
    await repo.findByProviderSubscriptionId("sub_1");
    expect(pool.calls[0].params).toEqual(["sub_1"]);
  });
});

describe("SubscriptionRepository.insertIfAbsent", () => {
  const row = {
    user_id: "user_1",
    plan_id: "monthly",
    status: "active",
    payment_provider: null,
    provider_customer_id: null,
    provider_subscription_id: null,
    current_period_start: "2026-07-01T00:00:00.000Z",
    current_period_end: "2026-10-01T00:00:00.000Z",
    cancel_at_period_end: false,
    updated_at: "2026-07-01T00:00:00.000Z",
  };

  test("reports the insert when a row was created", async () => {
    pool.on(/insert into subscriptions/, () => ({ rowCount: 1, rows: [] }));
    expect(await repo.insertIfAbsent(row)).toMatchObject({ inserted: true });
  });

  test("reports no insert when the user already had a row", async () => {
    // The unique index on user_id is what makes the grant idempotent.
    pool.on(/insert into subscriptions/, () => ({ rowCount: 0, rows: [] }));
    expect(await repo.insertIfAbsent(row)).toMatchObject({ inserted: false });
  });
});

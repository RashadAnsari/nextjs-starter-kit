import { describe, expect, test } from "bun:test";
import {
  hasPremiumAccess,
  isPlanId,
  isTrialEligible,
  NO_SUBSCRIPTION,
  PLAN_IDS,
  type UserSubscription,
} from "./plans";

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

function sub(overrides: Partial<UserSubscription>): UserSubscription {
  return { ...NO_SUBSCRIPTION, ...overrides };
}

describe("hasPremiumAccess", () => {
  test("denies a user with no subscription row", () => {
    expect(hasPremiumAccess(NO_SUBSCRIPTION)).toBe(false);
  });

  describe("manual grants (no payment provider)", () => {
    test("allows until the period end", () => {
      expect(
        hasPremiumAccess(sub({ planId: "monthly", status: "active", currentPeriodEnd: FUTURE }))
      ).toBe(true);
    });

    test("denies after the period end, whatever the status says", () => {
      expect(
        hasPremiumAccess(sub({ planId: "monthly", status: "active", currentPeriodEnd: PAST }))
      ).toBe(false);
    });

    test("denies when the period end is missing", () => {
      expect(
        hasPremiumAccess(sub({ planId: "monthly", status: "active", currentPeriodEnd: null }))
      ).toBe(false);
    });
  });

  describe("provider-backed subscriptions", () => {
    const provider = { planId: "monthly" as const, paymentProvider: "paddle" };

    test("allows active even past the period end (renewal window)", () => {
      expect(hasPremiumAccess(sub({ ...provider, status: "active", currentPeriodEnd: PAST }))).toBe(
        true
      );
    });

    test("allows trialing", () => {
      expect(
        hasPremiumAccess(sub({ ...provider, status: "trialing", currentPeriodEnd: FUTURE }))
      ).toBe(true);
    });

    test("allows past_due while the provider retries payment", () => {
      expect(
        hasPremiumAccess(sub({ ...provider, status: "past_due", currentPeriodEnd: PAST }))
      ).toBe(true);
    });

    test("allows cancelled inside the paid period", () => {
      expect(
        hasPremiumAccess(sub({ ...provider, status: "cancelled", currentPeriodEnd: FUTURE }))
      ).toBe(true);
    });

    test("denies cancelled after the paid period", () => {
      expect(
        hasPremiumAccess(sub({ ...provider, status: "cancelled", currentPeriodEnd: PAST }))
      ).toBe(false);
    });

    test("denies expired", () => {
      expect(
        hasPremiumAccess(sub({ ...provider, status: "expired", currentPeriodEnd: FUTURE }))
      ).toBe(false);
    });
  });
});

describe("isTrialEligible", () => {
  test("eligible only when there is no subscription row", () => {
    expect(isTrialEligible(NO_SUBSCRIPTION)).toBe(true);
  });

  test("not eligible once any subscription exists, even a cancelled one", () => {
    expect(isTrialEligible(sub({ planId: "monthly", status: "cancelled" }))).toBe(false);
  });
});

describe("isPlanId", () => {
  test("accepts every offered plan", () => {
    for (const planId of PLAN_IDS) {
      expect(isPlanId(planId)).toBe(true);
    }
  });

  test("rejects anything else the checkout route might be handed", () => {
    // The value reaches this straight from a request body, so non-strings have
    // to be rejected as firmly as unknown plan names.
    for (const value of ["enterprise", "", null, undefined, 1, {}, ["monthly"]]) {
      expect(isPlanId(value)).toBe(false);
    }
  });
});

#!/usr/bin/env bun
/**
 * Manually grant access to a user, with no payment provider behind it. Useful
 * for team accounts, support gestures, and testing the paid experience.
 *
 * Usage:
 *   bun scripts/grant-subscription.ts <userId> [months]
 *
 * The user id is the "user".id value from the database (Better Auth generates
 * these; they are random strings rather than UUIDs).
 */
import { pool } from "@/lib/db";
import { DEFAULT_PLAN_ID } from "@/lib/payment/plans";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { SubscriptionEventRepository } from "@/lib/repositories/subscriptionEventRepository";

function usage(msg?: string): never {
  if (msg) {
    console.error(`Error: ${msg}\n`);
  }
  console.error("Usage: bun scripts/grant-subscription.ts <userId> [months]");
  process.exit(1);
}

const [userId, monthsArg = "1"] = process.argv.slice(2);

if (!userId) {
  usage("missing userId");
}

const months = Number(monthsArg);
if (!Number.isInteger(months) || months < 1) {
  usage(`months must be a positive integer, got "${monthsArg}"`);
}

const now = new Date();
const periodEnd = new Date(now);
periodEnd.setMonth(periodEnd.getMonth() + months);

const { error } = await new SubscriptionRepository(pool).upsert({
  user_id: userId,
  plan_id: DEFAULT_PLAN_ID,
  status: "active",
  payment_provider: null,
  provider_customer_id: null,
  provider_subscription_id: null,
  current_period_start: now.toISOString(),
  current_period_end: periodEnd.toISOString(),
  cancel_at_period_end: false,
  updated_at: now.toISOString(),
});

if (error) {
  console.error("Failed:", error.message);
  await pool.end();
  process.exit(1);
}

await new SubscriptionEventRepository(pool).record({
  user_id: userId,
  event_type: "manual_grant",
  plan_id: DEFAULT_PLAN_ID,
  status: "active",
  payment_provider: null,
  current_period_start: now.toISOString(),
  current_period_end: periodEnd.toISOString(),
  cancel_at_period_end: false,
  occurred_at: now.toISOString(),
});

console.log(`Granted ${months} month(s) of access to user ${userId}`);
console.log(`  Expires: ${periodEnd.toISOString()}`);

await pool.end();

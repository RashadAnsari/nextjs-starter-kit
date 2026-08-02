#!/usr/bin/env bun
/**
 * Permanently erase a user and everything the app stores about them.
 *
 * Usage:
 *   bun run delete-user <email|userId> [--yes] [--skip-provider]
 *                                      [--purge-billing-history]
 *
 * Through `bun run` rather than directly, because the package.json script adds
 * the --preload that lets this import the app's server-only modules. See
 * scripts/allow-server-only.ts.
 *
 * The order is deliberate. The payment provider comes first, so a subscription
 * can never keep billing an account that no longer exists. Uploads come next,
 * because object storage takes no part in the database cascade and the keys are
 * only reachable through the user id. The "user" row goes last, and its cascade
 * removes sessions, accounts, payment customers and subscriptions in one
 * transaction.
 *
 * subscription_events is deliberately outside that cascade (see migration
 * 0004): it is the append-only financial history, and a payment dispute can be
 * raised after the account is gone. Erasing a user who has any is therefore an
 * explicit choice, made with --purge-billing-history, rather than a silent
 * side effect of deleting them.
 *
 * The same transaction records the address in deleted_accounts, which blocks a
 * later sign-up on it: an erased account does not get a fresh trial, and the
 * archived customer at the payment provider still holds that address anyway.
 *
 * Every step is safe to repeat, so a run that fails halfway can be run again.
 *
 * Flags:
 *   --yes                     skip the interactive confirmation (for scripted runs)
 *   --skip-provider           leave the payment provider untouched, for when the
 *                             subscription or customer was already retired there
 *   --purge-billing-history   also delete the subscription_events rows, which
 *                             the deletion otherwise refuses to touch
 */
import { pool } from "@/lib/db";
import { getPaymentProviderByName } from "@/lib/payment/provider";
import { DeletedAccountRepository } from "@/lib/repositories/deletedAccountRepository";
import { PaymentCustomerRepository } from "@/lib/repositories/paymentCustomerRepository";
import { SubscriptionRepository } from "@/lib/repositories/subscriptionRepository";
import { deleteUserUploads } from "@/lib/storage/uploads";
import { createInterface } from "node:readline/promises";

const KNOWN_FLAGS = new Set(["--yes", "--skip-provider", "--purge-billing-history"]);

interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

function usage(msg: string): never {
  console.error(`Error: ${msg}\n`);
  console.error(
    "Usage: bun run delete-user <email|userId> [--yes] [--skip-provider] " +
      "[--purge-billing-history]"
  );
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const [identifier, ...extra] = args.filter((arg) => !arg.startsWith("--"));

  const unknownFlag = flags.find((flag) => !KNOWN_FLAGS.has(flag));
  if (unknownFlag) {
    usage(`unknown flag ${unknownFlag}`);
  }
  if (!identifier) {
    usage("missing <email|userId>");
  }
  if (extra.length > 0) {
    usage("expected a single email or user id");
  }

  return {
    identifier,
    skipConfirmation: flags.includes("--yes"),
    skipProvider: flags.includes("--skip-provider"),
    purgeBillingHistory: flags.includes("--purge-billing-history"),
  };
}

async function findUser(identifier: string): Promise<UserRow> {
  // Better Auth lowercases emails on sign-up; compare case-insensitively
  // anyway so an address typed with capitals still resolves.
  const { rows } = await pool.query<UserRow>(
    `select id, email, name, "createdAt" from "user" where id = $1 or lower(email) = lower($1)`,
    [identifier]
  );
  const user = rows[0];
  if (!user) {
    throw new Error(`no user matches "${identifier}"`);
  }
  return user;
}

/** Print who is about to be deleted and how many rows hang off them. */
async function printSummary(user: UserRow): Promise<void> {
  const { rows } = await pool.query<Record<string, string>>(
    `select
       (select count(*) from subscriptions       where user_id = $1) as subscriptions,
       (select count(*) from subscription_events where user_id = $1) as subscription_events,
       (select count(*) from payment_customers   where user_id = $1) as payment_customers,
       (select count(*) from "session"           where "userId" = $1) as sessions,
       (select count(*) from "account"           where "userId" = $1) as accounts`,
    [user.id]
  );

  console.log(`User:    ${user.name} <${user.email}>`);
  console.log(`Id:      ${user.id}`);
  console.log(`Joined:  ${user.createdAt.toISOString()}`);
  console.log("Rows to delete:");
  for (const [table, count] of Object.entries(rows[0])) {
    console.log(`  ${table.padEnd(20)} ${count}`);
  }
}

async function confirm(user: UserRow): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\nThis cannot be undone, and ${user.email} will be blocked from signing up again.\n` +
      `Type ${user.email} to confirm: `
  );
  rl.close();
  if (answer.trim() !== user.email) {
    throw new Error("confirmation did not match, nothing was deleted");
  }
}

/**
 * Refuse to start when the user has billing history and the operator has not
 * said what to do with it. Checked before anything destructive runs, so the
 * answer is "nothing was deleted" rather than a half-erased account left by a
 * foreign key violation on the very last statement.
 */
async function assertBillingHistoryDecision(user: UserRow, purge: boolean): Promise<void> {
  if (purge) {
    return;
  }
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) as count from subscription_events where user_id = $1`,
    [user.id]
  );
  const count = Number(rows[0]?.count ?? 0);
  if (count > 0) {
    throw new Error(
      `${user.email} has ${count} subscription_events row(s), the append-only billing history.\n` +
        "It is kept on purpose: a payment dispute can be raised after the account is gone.\n" +
        "Re-run with --purge-billing-history to delete it too."
    );
  }
}

/**
 * Cancel any live subscription and archive the customer records, so billing
 * stops and the provider no longer lists the person as a customer.
 */
async function eraseAtPaymentProvider(user: UserRow): Promise<void> {
  const subscription = await new SubscriptionRepository(pool).findByUserId(user.id);
  const isBillable = subscription?.status === "active" || subscription?.status === "trialing";

  if (subscription?.payment_provider && subscription.provider_subscription_id && isBillable) {
    const provider = getPaymentProviderByName(subscription.payment_provider);
    if (!provider) {
      throw new Error(`unknown payment provider "${subscription.payment_provider}"`);
    }
    try {
      // Immediately: there is no account left to keep access for.
      await provider.cancelSubscription(
        subscription.provider_subscription_id,
        subscription.provider_customer_id,
        true
      );
    } catch (error) {
      throw new Error(
        `could not cancel subscription ${subscription.provider_subscription_id}: ` +
          `${error instanceof Error ? error.message : error}\n` +
          "Cancel it in the provider dashboard, then re-run with --skip-provider."
      );
    }
    console.log(`\nCancelled subscription ${subscription.provider_subscription_id}`);
  }

  const customers = await new PaymentCustomerRepository(pool).listByUserId(user.id);
  for (const customer of customers) {
    const provider = getPaymentProviderByName(customer.provider);
    if (!provider) {
      throw new Error(`unknown payment provider "${customer.provider}"`);
    }
    try {
      await provider.archiveCustomer(customer.customer_id);
    } catch (error) {
      throw new Error(
        `could not archive ${customer.provider} customer ${customer.customer_id}: ` +
          `${error instanceof Error ? error.message : error}\n` +
          "Archive it in the provider dashboard, then re-run with --skip-provider."
      );
    }
    console.log(`Archived ${customer.provider} customer ${customer.customer_id}`);
  }
}

/**
 * Delete the user row, whose cascade takes the rest of the tables with it, plus
 * the verification tokens, which have no user_id column and so are outside it.
 */
async function eraseFromDatabase(user: UserRow, purgeBillingHistory: boolean): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Password reset and delete-account tokens store the user id in value;
    // email-keyed tokens store the address in identifier.
    const verifications = await client.query(
      `delete from verification where value = $1 or value = $2 or identifier = $2`,
      [user.id, user.email]
    );
    if (purgeBillingHistory) {
      // Outside the cascade by design, so it has to go explicitly, and before
      // the user row: its foreign key is restrict, not cascade.
      await client.query(`delete from subscription_events where user_id = $1`, [user.id]);
    }
    // Blocks a re-signup on the same address, and records that the erasure was
    // carried out. In the transaction so the address can never be freed for
    // re-use by a delete that then rolls back.
    const { error } = await new DeletedAccountRepository(client).record(user.email);
    if (error) {
      throw error;
    }
    // Cascades to session, account, payment_customers and subscriptions.
    await client.query(`delete from "user" where id = $1`, [user.id]);
    await client.query("commit");
    return verifications.rowCount ?? 0;
  } catch (error) {
    await client.query("rollback");
    throw new Error(
      `database delete rolled back: ${error instanceof Error ? error.message : error}`
    );
  } finally {
    client.release();
  }
}

async function deleteUser(): Promise<void> {
  const { identifier, skipConfirmation, skipProvider, purgeBillingHistory } = parseArgs();
  const user = await findUser(identifier);

  await printSummary(user);
  await assertBillingHistoryDecision(user, purgeBillingHistory);
  if (!skipConfirmation) {
    await confirm(user);
  }

  if (skipProvider) {
    console.log("\nSkipping the payment provider (--skip-provider)");
  } else {
    await eraseAtPaymentProvider(user);
  }

  try {
    const deleted = await deleteUserUploads(user.id);
    console.log(`Deleted ${deleted} object(s) from object storage`);
  } catch (error) {
    throw new Error(
      `could not delete uploads: ${error instanceof Error ? error.message : error}\n` +
        "The database rows are untouched, so re-running the script is safe."
    );
  }

  const verificationsDeleted = await eraseFromDatabase(user, purgeBillingHistory);
  console.log(`Deleted ${verificationsDeleted} verification token(s)`);

  console.log(`\nDeleted user ${user.email} (${user.id})`);
  console.log("That address can no longer be used to sign up.");
  if (!skipProvider) {
    console.log(
      "Note: the payment provider keeps paid transactions and invoices for tax reporting, " +
        "so the archived customer record still exists on their side."
    );
  }
}

try {
  await deleteUser();
} catch (error) {
  console.error(`\nFailed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

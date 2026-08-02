import { createHmac } from "node:crypto";
import normalizeEmail from "validator/lib/normalizeEmail";
import { runWrite, type DbClient } from "./client";

/**
 * Collapse the spellings that reach the same mailbox, so the block cannot be
 * stepped around with a dot or a +tag. Provider by provider, because the rules
 * are not general: a dot is meaningless at Gmail and significant nearly
 * everywhere else, and a + is only a subaddress at providers that say so. For
 * an unknown domain the address is left alone apart from case, which is the
 * safe direction to be wrong in: a missed variant lets one person back in,
 * while an over-eager rule locks out a stranger who never asked for anything.
 *
 * yahoo_remove_subaddress is off for exactly that reason. Yahoo's separator is
 * "-", and the library drops the last hyphenated component, so jan-willem@
 * would collapse onto jan@ and delete one user's address to block another.
 * Hyphenated given names are common enough that this is a real hazard rather
 * than a curiosity. Turn it back on only if you know your users cannot have
 * one.
 */
function normalizeForHash(email: string): string {
  const trimmed = email.trim();
  // false when nothing is left of the local part, e.g. "+tag@gmail.com". Such
  // an address cannot be signed up with anyway, so fall back to the raw form
  // rather than collapsing every one of them onto a single digest.
  return normalizeEmail(trimmed, { yahoo_remove_subaddress: false }) || trimmed.toLowerCase();
}

/**
 * Keys the digest with a secret the database does not hold, so a copy of this
 * table alone cannot be tested against a candidate address. See migration 0005
 * for what rotating the secret costs.
 */
function hashEmail(email: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }
  return createHmac("sha256", secret).update(normalizeForHash(email)).digest("hex");
}

/**
 * All deleted_accounts table access: the addresses that may not sign up again.
 * Callers pass the plain address and never see the digest, so there is one
 * place that decides how it is derived.
 */
export class DeletedAccountRepository {
  constructor(private readonly db: DbClient) {}

  /** Whether this address belonged to an account that was erased. */
  async isDeleted(email: string): Promise<boolean> {
    const { rows } = await this.db.query<{ deleted: boolean }>(
      `select exists (select 1 from deleted_accounts where email_hash = $1) as deleted`,
      [hashEmail(email)]
    );
    return rows[0]?.deleted ?? false;
  }

  /** Idempotent: re-recording an address keeps the first deletion date. */
  async record(email: string) {
    return runWrite(() =>
      this.db.query(
        `insert into deleted_accounts (email_hash) values ($1) on conflict do nothing`,
        [hashEmail(email)]
      )
    );
  }
}

import { runWrite, type DbClient } from "./client";

export interface SubscriptionRow {
  plan_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  payment_provider: string | null;
}

/** A subscription record to upsert (the full current snapshot for a user). */
export interface SubscriptionUpsert {
  user_id: string;
  plan_id: string;
  status: string;
  payment_provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  updated_at: string;
}

const COLUMNS =
  "plan_id, status, current_period_end, cancel_at_period_end, provider_subscription_id, provider_customer_id, payment_provider";

const UPSERT_VALUES = (row: SubscriptionUpsert) => [
  row.user_id,
  row.plan_id,
  row.status,
  row.payment_provider,
  row.provider_customer_id,
  row.provider_subscription_id,
  row.current_period_start,
  row.current_period_end,
  row.cancel_at_period_end,
  row.updated_at,
];

/** Columns updateByUserId may write. user_id is excluded: it is the filter. */
const UPDATABLE_COLUMNS = new Set([
  "plan_id",
  "status",
  "payment_provider",
  "provider_customer_id",
  "provider_subscription_id",
  "current_period_start",
  "current_period_end",
  "cancel_at_period_end",
  "updated_at",
]);

const INSERT_SQL = `insert into subscriptions
    (user_id, plan_id, status, payment_provider, provider_customer_id,
     provider_subscription_id, current_period_start, current_period_end,
     cancel_at_period_end, updated_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

/** All subscriptions table access. The table holds one row per user. */
export class SubscriptionRepository {
  constructor(private readonly db: DbClient) {}

  /** The user's current subscription row, or null if they never subscribed. */
  async findByUserId(userId: string): Promise<SubscriptionRow | null> {
    const { rows } = await this.db.query<SubscriptionRow>(
      `select ${COLUMNS} from subscriptions where user_id = $1`,
      [userId]
    );
    return rows[0] ?? null;
  }

  /** Look up a subscription by its provider-side id (for webhook handling). */
  async findByProviderSubscriptionId(providerSubscriptionId: string) {
    const { rows } = await this.db.query<{
      user_id: string;
      status: string;
      payment_provider: string | null;
    }>(
      `select user_id, status, payment_provider from subscriptions
        where provider_subscription_id = $1`,
      [providerSubscriptionId]
    );
    return rows[0] ?? null;
  }

  /** Create or replace the user's current subscription snapshot. */
  async upsert(row: SubscriptionUpsert) {
    return runWrite(() =>
      this.db.query(
        `${INSERT_SQL}
         on conflict (user_id) do update set
           plan_id = excluded.plan_id,
           status = excluded.status,
           payment_provider = excluded.payment_provider,
           provider_customer_id = excluded.provider_customer_id,
           provider_subscription_id = excluded.provider_subscription_id,
           current_period_start = excluded.current_period_start,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = excluded.updated_at`,
        UPSERT_VALUES(row)
      )
    );
  }

  /**
   * Apply a provider webhook snapshot. Unlike upsert, the update only wins
   * when the incoming event is not older than the last applied one
   * (last_event_at), so a delayed retry of an earlier event cannot overwrite
   * newer state, e.g. resurrect access after a cancellation. Returns whether
   * the snapshot was applied; false means the event was stale and skipped.
   */
  async applyProviderEvent(row: SubscriptionUpsert, occurredAt: string) {
    const { data, error } = await runWrite(() =>
      this.db.query(
        `insert into subscriptions
           (user_id, plan_id, status, payment_provider, provider_customer_id,
            provider_subscription_id, current_period_start, current_period_end,
            cancel_at_period_end, updated_at, last_event_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         on conflict (user_id) do update set
           plan_id = excluded.plan_id,
           status = excluded.status,
           payment_provider = excluded.payment_provider,
           provider_customer_id = excluded.provider_customer_id,
           provider_subscription_id = excluded.provider_subscription_id,
           current_period_start = excluded.current_period_start,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = excluded.updated_at,
           last_event_at = excluded.last_event_at
         where subscriptions.last_event_at is null
            or subscriptions.last_event_at <= excluded.last_event_at`,
        [...UPSERT_VALUES(row), occurredAt]
      )
    );
    return { applied: (data?.rowCount ?? 0) > 0, error };
  }

  /**
   * Mark a subscription past_due after a failed payment, without touching the
   * period dates. Skipped for cancelled or expired rows (a late failure event
   * must not re-grant the access that past_due status carries) and for events
   * older than the last applied one. Returns whether a row was updated.
   */
  async markPastDue(userId: string, updatedAt: string, occurredAt: string) {
    const { data, error } = await runWrite(() =>
      this.db.query(
        `update subscriptions
            set status = 'past_due', updated_at = $2, last_event_at = $3
          where user_id = $1
            and status not in ('cancelled', 'expired')
            and (last_event_at is null or last_event_at <= $3)`,
        [userId, updatedAt, occurredAt]
      )
    );
    return { applied: (data?.rowCount ?? 0) > 0, error };
  }

  /**
   * Insert a subscription only if the user has none yet. Returns whether a row
   * was newly created (false when one already existed). Idempotent via the
   * unique index on user_id.
   */
  async insertIfAbsent(row: SubscriptionUpsert) {
    const { data, error } = await runWrite(() =>
      this.db.query(`${INSERT_SQL} on conflict (user_id) do nothing`, UPSERT_VALUES(row))
    );
    return { inserted: (data?.rowCount ?? 0) > 0, error };
  }

  /**
   * Patch the user's subscription row. Column names are the only part of a
   * query in this codebase that is not a bound parameter, so they are checked
   * against a fixed list rather than trusted: a caller that ever passes request
   * data through here fails loudly instead of building the SET clause from it.
   */
  async updateByUserId(userId: string, patch: Partial<SubscriptionUpsert>) {
    const entries = Object.entries(patch);
    if (entries.length === 0) {
      return { data: null, error: null };
    }
    const unknown = entries.map(([column]) => column).filter((c) => !UPDATABLE_COLUMNS.has(c));
    if (unknown.length > 0) {
      throw new Error(`Refusing to update unknown subscriptions columns: ${unknown.join(", ")}`);
    }
    const assignments = entries.map(([column], i) => `${column} = $${i + 2}`).join(", ");
    return runWrite(() =>
      this.db.query(`update subscriptions set ${assignments} where user_id = $1`, [
        userId,
        ...entries.map(([, value]) => value),
      ])
    );
  }
}

import { runWrite, type DbClient } from "./client";

/** A single append-only entry in the subscription history. */
export interface SubscriptionEvent {
  user_id: string;
  event_type: string;
  plan_id?: string | null;
  status?: string | null;
  payment_provider?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  raw_event?: unknown;
  occurred_at?: string;
}

/** Append-only log of subscription state changes. */
export class SubscriptionEventRepository {
  constructor(private readonly db: DbClient) {}

  /** Record one history entry. Never throws; logging must not break the write path. */
  async record(event: SubscriptionEvent) {
    const result = await runWrite(() =>
      this.db.query(
        `insert into subscription_events
           (user_id, event_type, plan_id, status, payment_provider, provider_customer_id,
            provider_subscription_id, current_period_start, current_period_end,
            cancel_at_period_end, raw_event, occurred_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12, now()))`,
        [
          event.user_id,
          event.event_type,
          event.plan_id ?? null,
          event.status ?? null,
          event.payment_provider ?? null,
          event.provider_customer_id ?? null,
          event.provider_subscription_id ?? null,
          event.current_period_start ?? null,
          event.current_period_end ?? null,
          event.cancel_at_period_end ?? null,
          event.raw_event ?? null,
          event.occurred_at ?? null,
        ]
      )
    );

    if (result.error) {
      console.error(
        "[subscription_events] Failed to record event_type=%s user=%s error=%o",
        event.event_type,
        event.user_id,
        result.error
      );
    }
    return result;
  }
}

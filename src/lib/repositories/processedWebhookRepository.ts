import type { DbClient } from "./client";

/**
 * Idempotency guard for payment webhooks. The key is a hash of the raw,
 * signature-verified webhook body, so a provider retry or a replayed captured
 * request maps to the same key and is processed only once.
 */
export class ProcessedWebhookRepository {
  constructor(private readonly db: DbClient) {}

  /** True when this event key has already been processed. */
  async isProcessed(eventKey: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `select 1 from processed_webhook_events where event_key = $1`,
      [eventKey]
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Mark an event key as processed. Idempotent: a duplicate key is ignored.
   * Never throws; a failure here must not fail an otherwise successful webhook.
   */
  async markProcessed(eventKey: string, eventType: string): Promise<void> {
    try {
      await this.db.query(
        `insert into processed_webhook_events (event_key, event_type) values ($1, $2)
         on conflict (event_key) do nothing`,
        [eventKey, eventType]
      );
    } catch (error) {
      console.error("[processed_webhook_events] Failed to record key error=%o", error);
    }
  }
}

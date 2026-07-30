import type { DbClient } from "./client";

/**
 * Idempotency guard for payment webhooks. The key is a hash of the raw,
 * signature-verified webhook body, so a provider retry or a replayed captured
 * request maps to the same key and is processed only once.
 */
export class ProcessedWebhookRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Atomically claim an event key before processing. Returns false when the
   * key is already claimed: another delivery of the same event has been
   * processed, or is being processed right now. Claiming before processing
   * (rather than marking after) closes the window where two concurrent
   * deliveries both pass a read check and both run the side effects.
   */
  async claim(eventKey: string, eventType: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `insert into processed_webhook_events (event_key, event_type) values ($1, $2)
       on conflict (event_key) do nothing`,
      [eventKey, eventType]
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Release a claimed key after a failed processing attempt, so the provider
   * retry is reprocessed instead of deduped away. Best effort: when the
   * release itself fails, the event stays claimed and its retries are lost,
   * which is logged loudly.
   */
  async release(eventKey: string): Promise<void> {
    try {
      await this.db.query(`delete from processed_webhook_events where event_key = $1`, [eventKey]);
    } catch (error) {
      console.error(
        "[processed_webhook_events] Failed to release key=%s error=%o",
        eventKey.slice(0, 12),
        error
      );
    }
  }
}

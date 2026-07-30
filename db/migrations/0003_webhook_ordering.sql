-- ============================================================
-- Out-of-order webhook guard
-- ============================================================
-- The processed_webhook_events dedupe catches byte-identical replays only.
-- Providers retry failed deliveries for days and do not guarantee ordering, so
-- a delayed older event (e.g. an activation retried after a cancellation) used
-- to overwrite newer state and resurrect access. The webhook handler now
-- stores the provider's event time on the snapshot row and skips any incoming
-- event that is older than the last applied one.

alter table subscriptions
  add column last_event_at timestamptz;

comment on column subscriptions.last_event_at is
  'provider event time of the last applied webhook; null for rows written outside the webhook path';

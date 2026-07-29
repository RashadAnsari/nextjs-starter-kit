-- ============================================================
-- payment_customers
-- ============================================================
-- The customer id a user has at each payment provider, so a returning customer
-- is reused rather than duplicated at checkout.

create table payment_customers (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null references "user" (id) on delete cascade,
  provider    text        not null,
  customer_id text        not null,
  created_at  timestamptz not null default now()
);

comment on column payment_customers.provider    is 'e.g. paddle';
comment on column payment_customers.customer_id is 'customer ID at the named payment provider';

-- One customer per provider per user.
create unique index payment_customers_user_provider_idx
  on payment_customers (user_id, provider);

-- ============================================================
-- subscriptions
-- ============================================================
-- The current state only: one row per user, overwritten on every change.
-- History lives in subscription_events.

create table subscriptions (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  text        not null references "user" (id) on delete cascade,
  plan_id                  text        not null check (plan_id in ('monthly')),
  status                   text        not null check (status in ('trialing', 'active', 'cancelled', 'past_due', 'expired')),
  payment_provider         text,
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_start     timestamptz,
  current_period_end       timestamptz not null,
  cancel_at_period_end     boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on column subscriptions.plan_id                  is 'must match a value in PLAN_IDS (src/lib/payment/subscription.ts)';
comment on column subscriptions.status                   is 'trialing | active | cancelled | past_due | expired';
comment on column subscriptions.payment_provider         is 'null for a manually granted subscription with no provider behind it';
comment on column subscriptions.provider_customer_id     is 'customer ID at the payment provider';
comment on column subscriptions.provider_subscription_id is 'subscription ID at the payment provider';
comment on column subscriptions.cancel_at_period_end     is 'true when the user requested cancellation; access continues until current_period_end';

-- One subscription row per user at most.
create unique index subscriptions_user_id_idx on subscriptions (user_id);

-- ============================================================
-- subscription_events: append-only history of subscription changes
-- ============================================================
-- Every change is recorded as an immutable event so there is a full audit
-- trail: manual grants, provider webhooks, and cancellations. Rows are never
-- updated or deleted by the app.

create table subscription_events (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  text        not null references "user" (id) on delete cascade,
  event_type               text        not null,
  plan_id                  text,
  status                   text,
  payment_provider         text,
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean,
  raw_event                jsonb,
  occurred_at              timestamptz not null default now(),
  created_at               timestamptz not null default now()
);

comment on table  subscription_events             is 'Append-only log of every subscription state change; subscriptions holds the current snapshot.';
comment on column subscription_events.event_type  is 'e.g. complimentary_grant, cancelled, cancel_scheduled, payment.failed, or a provider event type';
comment on column subscription_events.raw_event   is 'normalised snapshot of the source event, for debugging';
comment on column subscription_events.occurred_at is 'when the change happened (provider event time when known, else now)';

create index subscription_events_user_occurred_idx
  on subscription_events (user_id, occurred_at desc);

-- ============================================================
-- processed_webhook_events: idempotency guard for payment webhooks
-- ============================================================
-- Payment providers retry webhooks, and a captured valid request can be
-- replayed within its signature window. Signature verification proves
-- authenticity but not freshness, so without a dedupe a replayed older event
-- (e.g. an "active" event after a cancellation) could resurrect access.
-- We record a key per processed event (a hash of the raw, signature-verified
-- body) and skip any event whose key we have already seen.

create table processed_webhook_events (
  event_key    text        primary key,
  event_type   text        not null,
  processed_at timestamptz not null default now()
);

comment on table  processed_webhook_events           is 'Idempotency keys for already-processed payment webhooks; prevents replay and double-processing.';
comment on column processed_webhook_events.event_key is 'SHA-256 of the raw, signature-verified webhook body.';

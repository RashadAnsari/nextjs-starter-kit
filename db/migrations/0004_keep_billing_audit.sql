-- ============================================================
-- Keep the billing audit trail when an account is deleted
-- ============================================================
-- subscription_events is the append-only financial history: grants, refunds,
-- and cancellations. It cascaded on user deletion, so deleting an account
-- destroyed exactly the record needed for a payment dispute raised afterwards.
-- Restrict instead: deleting a user with billing history now fails until an
-- explicit deletion flow decides what to do with that history. Rows for users
-- without billing history are unaffected, and payment_customers and
-- subscriptions (current state, not history) still cascade.

alter table subscription_events
  drop constraint subscription_events_user_id_fkey;

alter table subscription_events
  add constraint subscription_events_user_id_fkey
  foreign key (user_id) references "user" (id) on delete restrict;

comment on constraint subscription_events_user_id_fkey on subscription_events is
  'restrict, not cascade: financial history must survive account deletion; an explicit deletion flow has to handle it';

-- ============================================================
-- deleted_accounts: addresses that may not sign up again
-- ============================================================
-- Erasing an account used to hand the person a clean slate: a new sign-up with
-- the same address got the free trial and any complimentary access a second
-- time, and the archived customer at the payment provider still held the
-- address, so their next checkout failed. Sign-up now refuses an address that
-- has been erased.
--
-- The address itself is not stored. A plain digest would not help, because the
-- space of email addresses is small enough to enumerate, so anyone holding a
-- copy of this table could test whether a named person had an account. The
-- value is an HMAC-SHA256 keyed with BETTER_AUTH_SECRET, which is not in the
-- database, so the check only works from inside the running app.
--
-- Consequence to remember: rotating BETTER_AUTH_SECRET makes every existing row
-- unmatchable and silently lifts the blocks. Rotation already invalidates
-- sessions and tokens, so it is a deliberate act, but this table cannot be
-- rebuilt by hand afterwards: the addresses are gone. Treat the secret as
-- permanent or accept that the list resets.
--
-- The row doubles as the record that an erasure request was carried out, which
-- is what accountability under GDPR Art. 5(2) asks for.

create table deleted_accounts (
  email_hash text        primary key,
  deleted_at timestamptz not null default now()
);

comment on table  deleted_accounts            is 'Addresses of erased accounts, blocked from signing up again.';
comment on column deleted_accounts.email_hash is 'HMAC-SHA256 of the normalised address, keyed with BETTER_AUTH_SECRET. Changing either the normalisation or the secret orphans every existing row.';
comment on column deleted_accounts.deleted_at is 'when the account was erased; the proof the request was carried out';

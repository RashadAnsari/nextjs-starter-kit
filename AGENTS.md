# Project agent instructions

These rules are the source of truth for working in this repository. Always read and follow this file before making code changes or refactors.

## This is NOT the Next.js you know

This is Next.js 16, which has breaking changes: APIs, conventions, and file structure may all differ from your training data. Notably, `middleware.ts` is gone and route protection lives in `src/proxy.ts`, exporting a function named `proxy`. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code, and heed deprecation notices.

## Package manager

- This project uses **bun**. Always use `bun` / `bunx`, never `npm`, `npx`, or `yarn`.

## Branding

- Never hardcode the product name, URL, support email, or brand colour. They live in `src/config/site.ts` and everything reads from there.
- Colours come from the `--brand-*` and `--gray-*` tokens in `src/app/globals.css`. Never write a raw hex value in a component. The one exception is `src/lib/email/templates.ts`, because email clients cannot read CSS variables; it uses `site.brandColor`.

## UI patterns

- **Forms**: always use `<form onSubmit={...}>` with `type="submit"` on the primary button, so Enter on any field submits. Use `gap-6` between fields in every form, never `gap-4` or another value.
- **Field errors**: pass as the `error` prop to `<Input>` so they render beneath the field. Never show field errors as standalone elements elsewhere.
- **Form-level errors** (e.g. server API errors): use `<ErrorBanner>` placed just above the `<form>`. Pass `string | null` and clear it in `onHide`.
- **Success feedback**: use `<SuccessBanner>`. Never use inline success `<p>` text.
- **Loading state**: disable the submit button and replace its label with a `…` suffix (e.g. `"Saving…"`) while a request is in flight.
- **Buttons**: use `<Button>` from `@/components/ui/Button`. The `.btn` CSS classes exist only for plain anchors in marketing sections.

## Server and client boundaries

- Anything that touches Postgres is server-only. `src/lib/payment/subscription.ts` imports `server-only` for this reason.
- Client components must import plan constants, types, and access rules from `@/lib/payment/plans`, never from `subscription.ts`: importing the latter pulls the `pg` connection pool into the browser bundle and the build fails.

## Security rules

- Every protected page and route handler must call `getSessionUser()` itself. `src/proxy.ts` only checks that a session cookie exists; it does not validate it and is not an access control mechanism.
- Never trust a redirect target from the URL. Pass it through `safeNextPath` / `afterAuthPath` in `@/lib/redirects`.
- Never build an object storage key from request data. Rebuild it from the session user id via `userUploadKey`.
- Never treat the payment success page as proof of payment. Only a signature-verified webhook may grant access.
- Read a webhook body with `req.text()`, never `req.json()`: verification runs over the exact bytes the provider signed.

## Database

- All SQL lives in `src/lib/repositories/`, one class per table. Do not write queries in route handlers or pages.
- Every query parameter must be bound. If a column name has to be dynamic, check it against a fixed allowlist first, as `SubscriptionRepository.updateByUserId` does.
- Every read of user-owned data must carry an explicit `user_id` filter: there is no row-level security behind it.
- Schema changes go in a new numbered file in `db/migrations/`. Never edit an applied migration, and never hand-edit `0001_auth.sql`.

## Responsive design

- **Desktop is the priority**: design for desktop first, and never degrade the desktop experience.
- **Mobile must work**: verify every UI change at ≤640px, checking that nothing breaks, overflows, or becomes unusable.

## Verification

- After every change, run `make local` (format, lint, typecheck, tests) and fix anything it reports before considering the work done.
- Tests run with `bun test`. Pure logic (access rules, redirect validation, upload keys) is tested directly; route handlers are tested with a stub pool and a fake provider, see `src/app/api/payments/webhook/route.test.ts`. `test/setup.ts` neutralises `server-only` for the test runtime.

## General rules

- **No duplicate components**: reuse existing ones with props rather than creating variants.
- **No duplicate code**: before writing a constant, function, or utility, search the codebase. If it exists, import it. Shared logic belongs in `src/lib/`, shared UI in `src/components/ui/`.
- **Punctuation**: no period on short labels, headings, button text, or single-phrase descriptions. Use a period on full sentences, especially multi-clause ones.
- **Em dash**: never use the em dash character in any user-facing text, copy, label, or metadata. Use a colon, comma, or period instead.

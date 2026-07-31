# Technical guide

How this starter kit is put together: what to change to make it yours, how each
piece works and why it works that way, and how to test and deploy it. The
[README](../README.md) covers what it is and how to get it running.

## Table of contents

- [Make it yours](#make-it-yours)
- [Project layout](#project-layout)
- [How the pieces work](#how-the-pieces-work)
  - [Authentication](#authentication)
  - [Database](#database)
  - [Email](#email)
  - [Error boundaries](#error-boundaries)
  - [SEO](#seo)
  - [Payments](#payments)
  - [Object storage](#object-storage)
  - [Analytics and consent](#analytics-and-consent)
  - [Environment variables, and when they are read](#environment-variables-and-when-they-are-read)
  - [Security headers](#security-headers)
  - [Replacing the generated assets](#replacing-the-generated-assets)
- [Testing](#testing)
- [Deployment](#deployment)
  - [Backups](#backups)
- [Commands](#commands)
- [Notes on versions](#notes-on-versions)

## Make it yours

1. **Name and branding.** Edit `src/config/site.ts`: name, tagline, description, canonical URL, support email, brand colour. Every page title, email, navbar, and footer reads from it.
2. **Colours.** Edit the `--brand-*` tokens in `src/app/globals.css`, and keep `site.brandColor` in sync (email clients cannot read CSS variables, so the templates need the literal value).
3. **Icons and social card.** There is no `public/` directory and no image assets to swap out. Everything is generated from the site config: `src/app/icon.tsx` produces the favicon plus the 192 and 512 sizes the web manifest needs, `src/app/apple-icon.tsx` the iOS home-screen icon, `src/app/opengraph-image.tsx` the social preview card, and `src/app/manifest.ts` the web manifest itself. All of them rebrand automatically. See [Replacing the generated assets](#replacing-the-generated-assets) when you have real artwork.
4. **Plan.** Edit `PLAN` in `src/components/pricing/PricingCards.tsx` and the plan ids in `src/lib/payment/plans.ts`.
5. **Legal pages.** The privacy, terms, and refund pages are a starting point, not legal advice. Review them with a lawyer before taking real customers. Note that there is no self-serve account deletion: the terms say to ask, so erasure requests are handled by hand until you build a flow for them, and `subscription_events` is deliberately kept when a user goes, since it is the financial record a payment dispute needs.
6. **Delete what you don't need.** The upload route (`src/app/api/uploads/`) and the whole `payment` module are self-contained: removing either one breaks nothing else.
7. **Package name.** Change `name` in `package.json`, the image name in `Dockerfile` and `deploy/`, and the database name in `docker-compose.yml`.

## Project layout

```
src/
  app/                 routes: pages, layouts, and API route handlers
  components/
    ui/                design-system primitives (Button, Input, banners)
    layout/            Navbar, Footer, legal page shell
    pricing/           checkout and plan components
    analytics/         consent-gated Google Analytics
  config/site.ts       everything that identifies your product
  lib/
    auth*.ts           Better Auth server config, browser client, session helper
    db.ts              the shared Postgres pool
    email/             SMTP transport and HTML templates
    payment/           plans (pure) + subscription (db) + provider interface
    repositories/      all SQL lives here, one class per table
    storage/           S3 client and upload helpers
    redirects.ts       safe post-auth redirect handling
  proxy.ts             route protection (Next.js 16's replacement for middleware.ts)
db/migrations/         numbered SQL files, applied in filename order
scripts/               migration runner and admin scripts
test/                  test setup and the scripted pool stand-in
deploy/                Ansible playbooks and compose templates for production
```

Tests live next to what they cover, as `*.test.ts` beside the module or route handler.

## How the pieces work

### Authentication

Better Auth is mounted at `/api/auth`, backed by the same Postgres pool as the rest of the app. Email verification is required, so a new account stays inactive until the confirmation link is clicked.

`src/proxy.ts` handles route protection, but only optimistically: it checks that a session cookie is present, not that it is valid. Every protected page and route handler calls `getSessionUser()` itself, and that is what actually enforces access. Add new public routes to `PUBLIC_PATHS` there. Forgetting to is a fail-closed mistake, which is the safe direction.

One consequence is worth knowing up front: an anonymous visitor to a URL that does not exist is redirected to the login page rather than shown the 404 page, because the proxy cannot tell an unknown route from a protected one. Signed-in visitors get the real 404. That is deliberate, since it also stops anyone from enumerating which routes exist, but if you would rather always show the 404, add a catch-all to `PUBLIC_PATHS`.

The guest-only pages, login and signup and the reset request, turn signed-in visitors away themselves by calling `redirectIfSignedIn()`. That belongs on the page rather than in the proxy for the same reason access control does: the proxy sees a cookie, not a session. Deciding it there means a cookie left behind by an expired session sends the visitor to a protected page, which sends them back to login, which sends them on again, and the two redirect at each other until the browser gives up. Validating where the answer is known makes that loop impossible to write.

`db/migrations/0001_auth.sql` is Better Auth's own generated schema. Do not hand-edit it. After changing the auth config or plugins, run the CLI against a running database and add what it reports as a new migration:

```bash
docker compose up -d
DATABASE_URL=... bunx @better-auth/cli generate --config src/lib/auth.ts
```

### Database

Any Postgres reachable through `DATABASE_URL`. `make migrate` applies `db/migrations/*.sql` in filename order and records what it applied in `schema_migrations`, each file in its own transaction. Re-running it is a no-op.

All SQL lives in `src/lib/repositories/`, one class per table, each taking a connection in its constructor so scripts and tests can pass their own pool. There is no per-user database role, so every read is written with an explicit `user_id` filter.

### Email

Any SMTP relay works. `src/lib/email/mailer.ts` is a single nodemailer transport reading the `SMTP_*` variables, and `sendEmail()` is the only way mail leaves the app. Port 587 with STARTTLS is the default. Relays name their credentials inconsistently: with Brevo, `SMTP_USER` is the SMTP login rather than the account email, and `SMTP_PASSWORD` is an SMTP key rather than the API key.

`src/lib/email/templates.ts` holds the two transactional emails Better Auth sends, confirmation and password reset. Both render through one `shell()` function, so a change to the frame applies to both, and adding an email means adding a function that calls it.

This is the one file allowed to use a literal colour. Email clients support neither CSS variables nor external stylesheets, so every style is inline and the brand colour comes from `site.brandColor` rather than from the `--brand-*` tokens. That is why `site.brandColor` duplicates `--brand-900`, and why the two have to be changed together.

### Error boundaries

`src/app/error.tsx` catches render and data errors anywhere below the root layout. `src/app/global-error.tsx` catches errors thrown by the root layout itself, which the first cannot, because it renders inside the layout that failed. That is why the global one ships its own `<html>` and `<body>` and inline styles: the layout that would have loaded the app's components and stylesheet is the thing that broke. Keep its markup minimal.

Both only `console.error`. Wire your error reporting service into `error.tsx` when you have one. In production the `digest` is the only handle you get on the real message, because Next.js strips server-side detail from client bundles so it cannot leak to the browser.

### SEO

`src/app/sitemap.ts` and `src/app/robots.ts` generate `/sitemap.xml` and `/robots.txt` from `site.url`, so they follow a rename with everything else. Both list routes explicitly: the sitemap carries the five public pages with their change frequencies, and robots allows those same paths while disallowing `/dashboard`, `/settings`, `/api/`, `/auth/`, and `/payment/`. Adding a public page means adding it in both, and neither is derived from `PUBLIC_PATHS` in the proxy, which serves a different purpose.

Per-page titles and descriptions come from each route's `metadata` export, with the template and defaults set in `src/app/layout.tsx`. The pricing page also emits FAQ structured data, which has to stay in step with the questions rendered beneath it or search engines will show answers the page does not contain.

### Payments

`src/lib/payment/types.ts` defines the `PaymentProvider` interface. Paddle implements it in `paddle.ts`. To add Stripe or Lemon Squeezy: implement the interface, register it in `getPaymentProviderByName` in `provider.ts`, and add its signature header to `SIGNATURE_HEADERS` in `src/app/api/payments/webhook/route.ts`. Those three points are the only places that name a provider; the pages and the rest of the API never do.

That third step exists because an incoming webhook has to be attributed before it can be verified, and the only trustworthy signal is which signature header it carries. Reading `PAYMENT_PROVIDER` instead would break the day you switch providers, since subscriptions created under the old one keep sending events.

**Paddle does not host the checkout page.** Creating a transaction returns `{your default payment link}?_ptxn={transaction id}`, a URL on your own domain, so `src/app/checkout/page.tsx` exists to receive it and open the Paddle.js overlay. Set the default payment link in the Paddle dashboard under Checkout settings to `https://yourdomain.com/checkout`. Miss this and checkout sends customers to whatever that setting points at, which is nothing.

Three details worth understanding before you change anything here:

- **The webhook is the source of truth.** `/payment/success` deliberately activates nothing, because anyone can visit that URL. Access is granted when the signature-verified webhook arrives.
- **Webhooks are deduplicated.** A hash of the raw verified body is stored in `processed_webhook_events`. Signature verification proves authenticity but not freshness, so without this a replayed older event could resurrect cancelled access.
- **The client token is read on the server.** `/checkout` reads `PADDLE_CLIENT_TOKEN` and passes it down as a prop. It is public by design, so inlining it would be safe, but it is only needed by one component and does not belong in every page's bundle.

**Before a provider is configured, access is complimentary.** With `PAYMENT_PROVIDER` unset, `grantComplimentaryAccess()` gives each account `COMPLIMENTARY_ACCESS_MONTHS` of a provider-less subscription, so the app works end to end before billing exists. Setting the variable turns it into a no-op.

Free access is never handed out silently. Two paths grant it, the dashboard on first visit and the pricing CTA through `/api/payments/complimentary`, and both land on the dashboard showing `WelcomeGiftModal`: how long the user has, that there is no charge, and that it will not become a paid plan. The second path needs the redirect flag because the row already exists by the time it arrives, so the dashboard's own grant reports nothing.

`hasPremiumAccess()` in `plans.ts` is the single access gate. Call it from every server route that serves paid content.

To receive webhooks against a local dev server, expose it through a tunnel and set `DEV_TUNNEL_HOST` to the tunnel host, which adds it to `allowedDevOrigins`:

```bash
cloudflared tunnel --url http://localhost:3000
```

### Object storage

Any S3-compatible provider. Objects are keyed by user id, and the key is always rebuilt from the session rather than from the request, so a crafted filename cannot reach another user's files. Private objects are read back through five-minute signed URLs.

Object storage enforces no size or content-type limit of its own, so `src/app/api/uploads/route.ts` is the only place either is checked. Keep those checks if you adapt it.

### Analytics and consent

Google Analytics loads only after the visitor accepts. Before that, no script and no cookie exist at all, which is what keeps it compliant under GDPR and ePrivacy. The choice is stored in `localStorage`, not a cookie, so nothing is written before consent is given. Leave `ANALYTICS_GA_MEASUREMENT_ID` empty and both the tracking and the banner disappear.

### Environment variables, and when they are read

Most variables are read on the server, per request. Set them in the container's environment and they take effect on restart, with no rebuild.

The exception is the `env` block in `next.config.ts`. Next.js substitutes those at build time, so they are baked into the image: setting one on a running container does nothing, and it must also be a `Dockerfile` build argument and a CI build arg. They also end up in JavaScript the browser downloads, so a secret must never go there. Only `ANALYTICS_GA_MEASUREMENT_ID` is in that block, because the analytics script needs it in the browser.

`PADDLE_CLIENT_TOKEN` is the instructive counter-example. It is a browser-side value too, but `src/app/checkout/page.tsx` reads it on the server and passes it down as a prop, so it stays ordinary runtime configuration and appears in neither `next.config.ts` nor the `Dockerfile`. Prefer that pattern: it keeps a value out of every page's bundle and lets you change it without rebuilding.

### Security headers

`next.config.ts` sets a Content-Security-Policy plus the usual hardening headers. The allowed media origins are derived from `ASSETS_BASE_URL` and `S3_ENDPOINT` rather than configured separately, so moving a bucket or putting a CDN in front of one needs no CSP edit.

### Replacing the generated assets

The icons, the social card, and the manifest are generated so that a fresh clone looks right before you have designed anything. Once you do, there are two ways to swap them in, and both are fully supported.

**Drop files into `src/app/`.** Next.js recognises them by filename and emits the `<head>` tags for you, exactly as the generated versions do. Delete the `.tsx` file first: a directory cannot hold both `icon.tsx` and `icon.png`.

| Delete                        | Add in `src/app/`                      |
| ----------------------------- | -------------------------------------- |
| `src/app/icon.tsx`            | `icon.png` (or `.ico`, `.jpg`, `.svg`) |
| `src/app/apple-icon.tsx`      | `apple-icon.png`                       |
| `src/app/opengraph-image.tsx` | `opengraph-image.png` (1200×630)       |
| `src/app/manifest.ts`         | `manifest.webmanifest`                 |

A `favicon.ico` also works, but only at the top level of `src/app/`, not in a nested segment.

**Or put them in `public/` instead.** This is the classic layout, and the right choice if you already have an icon set from a generator like RealFaviconGenerator, or if something outside the app needs the files at fixed URLs. There is no `public/` directory in a fresh clone, so create one. Nothing is auto-detected this way: delete the corresponding `.tsx` files and declare each asset in the `metadata` export in `src/app/layout.tsx`.

```ts
export const metadata: Metadata = {
  // …
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    // …
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: site.name }],
  },
};
```

Two things to know before choosing:

- **Nothing in `public/` rebrands itself.** The generated versions read `site.name` and `site.brandColor`, so renaming the product updates them. Static files do not, and the manifest then duplicates the name and theme colour in a second place that can drift.
- **`public/` needs no proxy change.** Its files carry extensions, which `src/proxy.ts` already excludes from route protection. The generated routes are extensionless (`/icon/192`, `/apple-icon`), which is why the matcher names them explicitly. If you move to `public/` you can drop those names from the matcher; if you add a new extensionless asset route, you must add it.

Mixing the two is fine. A common split is a designed `opengraph-image.png` in `src/app/` alongside a generated favicon, or a full icon set in `public/` while the social card stays generated.

## Testing

`make test` runs 97 tests in about a tenth of a second, with no database and no network. `make local` runs them alongside format, lint, and typecheck. CI calls the same targets on every push and pull request, so a green run locally is a green run there.

The suite covers **89% of lines and 91% of functions** in the modules it exercises. `make coverage` prints the table. Read that number for what it is: Bun measures only files the tests import, so it describes the payment, repository, redirect, and route-protection modules rather than the whole tree. Pages and React components are not counted, and not tested.

That is deliberate. This is a template, so the tests cover what every app built on it inherits and would be expensive to get subtly wrong:

| Area             | What is pinned                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Route protection | An unlisted path redirects to login rather than falling through, and a stale session cookie cannot start a redirect loop |
| Redirects        | `safeNextPath` rejects absolute, protocol-relative, backslash, and non-http targets                                      |
| Access rules     | `hasPremiumAccess` across manual grants, the renewal window, and every provider status                                   |
| Checkout         | A returning customer cannot claim a second trial, and a user with access cannot buy twice                                |
| Cancellation     | A trial ends now, a paid plan runs to the period end, and a provider failure leaves the row alone                        |
| Webhooks         | Replays are deduplicated, stale events are skipped, and every write failure releases the claim so the retry lands        |
| SQL safety       | The column allowlist on `updateByUserId`, the one query not built purely from bound parameters                           |
| Storage keys     | Object keys are namespaced by user id and a crafted filename cannot climb out of the prefix                              |

What is not covered is as deliberate. Provider signature verification in `paddle.ts` is stubbed, because proving it needs a genuine signed fixture from a provider you may well replace. The upload route is a worked example, so only its key-building helper is tested, not its size and content-type limits. Anything that depends on real SQL semantics, such as the conditional upsert and the idempotency claim insert, has to be proven against a live database instead.

Route handlers are tested against `test/stubPool.ts`, a scripted stand-in for the connection pool that records every statement and can force a driver error on any one of them. Pure logic is tested directly. See `src/app/api/payments/webhook/route.test.ts` for the pattern to copy.

## Deployment

The app and the infrastructure it depends on are two independent compose stacks on the same host, each with its own playbook, so redeploying the app never restarts Postgres.

| Stack | Playbook            | Template                            | Triggered by                                       |
| ----- | ------------------- | ----------------------------------- | -------------------------------------------------- |
| Infra | `deploy/infra.yaml` | `deploy/tmpls/infra-compose.yml.j2` | the **Infra** workflow, manually                   |
| App   | `deploy/app.yaml`   | `deploy/tmpls/app-compose.yml.j2`   | the deploy job in `build.yml`, on push to `master` |

The infra stack holds the stateful services (Postgres and its backup sidecar) and owns the `app_network` Docker network. The app stack joins that network as an external network and reaches Postgres by hostname, so the database port is never published. Run the Infra workflow once before the first app deploy; `deploy/app.yaml` fails early with a clear error if the network is missing.

Migrations run from `deploy/app.yaml` after the app container starts, since the schema belongs to the app version being deployed rather than to the infra stack.

CI already builds the production image on every push and pull request, so a change that breaks the `Dockerfile` fails there rather than at deploy time. It stops at building: nothing is published or shipped anywhere. To enable deployment on top of that, point the inventory in both workflows at your server, add the secrets they reference, and uncomment the `deploy` job in `.github/workflows/build.yml`.

### Backups

The infra stack runs a `db-backup` sidecar. Every 24 hours it takes a `pg_dump --format=custom` and uploads it to a private backups bucket under a `YYYY/MM/DD/` key. It runs on the same image as the server so `pg_dump` always matches the server's major version, and it uses its own storage credentials scoped to the backups bucket, so a compromised app container cannot reach a dump of the whole database.

Set up once: a private backups bucket with a lifecycle rule for however long you want to keep dumps (the script never deletes anything), and a storage token with object read and write scoped to that bucket alone.

A dump smaller than 1 KB is refused rather than uploaded, so a failed or half-written dump cannot age out the good ones under the lifecycle rule. The container reports unhealthy if no backup has succeeded in 26 hours, which is the signal to watch.

To restore, copy a dump down and feed it to `pg_restore`:

```bash
aws s3 cp s3://your-backups/2026/01/01/app-20260101T020000Z.dump . \
  --endpoint-url "$S3_ENDPOINT"
docker compose -f /etc/app/infra-compose.yml cp \
  app-20260101T020000Z.dump postgres:/tmp/restore.dump
docker compose -f /etc/app/infra-compose.yml exec -T postgres \
  pg_restore -U app -d app --clean --if-exists /tmp/restore.dump
```

Stop the app stack first so nothing writes during the restore. Rehearse this at least once: an untested backup is not a backup.

## Commands

| Command         | What it does                                           |
| --------------- | ------------------------------------------------------ |
| `make dev`      | Start the dev server                                   |
| `make up`       | Start the local Postgres container                     |
| `make down`     | Stop it                                                |
| `make migrate`  | Apply pending migrations                               |
| `make db-shell` | Open `psql` against the local database                 |
| `make test`     | Run the test suite                                     |
| `make coverage` | Run it with a coverage table                           |
| `make local`    | Format, lint, typecheck, test: run before every commit |
| `make build`    | Production build                                       |

`bun scripts/grant-subscription.ts <userId> [months]` grants access manually, with no payment provider behind it. Useful for team accounts and support gestures.

## Notes on versions

- **TypeScript is pinned to 5.x, not 7.** `eslint-config-next` depends on `typescript-eslint` v8, which supports `typescript >=4.8.4 <6.1.0`. TypeScript 7 will work here once that peer range moves.
- **ESLint is pinned to 9, not 10.** `eslint-plugin-react`, bundled by `eslint-config-next`, crashes on ESLint 10 (`contextOrFilename.getFilename is not a function`).

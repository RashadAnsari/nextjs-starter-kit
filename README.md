# Next.js Starter Kit

A production-ready Next.js template with the parts every SaaS needs already built: authentication, Postgres, transactional email, object storage, subscriptions, analytics with cookie consent, and a one-command deploy to your own server.

It is deliberately not a framework. Everything is plain Next.js, plain SQL, and a thin repository layer, so you can read all of it in an afternoon and change any part of it without fighting an abstraction.

## What's inside

| Area          | What you get                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4                                                    |
| **Auth**      | Better Auth with email and password, required email verification, password reset, session-aware route protection |
| **Database**  | Postgres over `pg`, a repository layer, and a migration runner for plain SQL files                               |
| **Email**     | SMTP through nodemailer, with branded HTML templates                                                             |
| **Payments**  | Provider-agnostic billing interface, Paddle implemented, signed webhooks with replay protection                  |
| **Storage**   | S3-compatible uploads, per-user key prefixes, short-lived signed URLs                                            |
| **Analytics** | Google Analytics 4 that loads only after consent, plus a GDPR-compliant consent banner                           |
| **Security**  | CSP and security headers, safe post-auth redirects, webhook idempotency                                          |
| **Pages**     | Landing, pricing, dashboard, settings, auth flows, 404, and privacy/terms/refund policies                        |
| **Ops**       | Docker build, GitHub Actions, Ansible playbooks, automated database backups to object storage                    |

## Quick start

```bash
bun install
cp .env.example .env.local     # then fill in the required values
make up                        # local Postgres on port 5432
make migrate                   # apply db/migrations
make dev                       # http://localhost:3000
```

The only values you need to get running are `DATABASE_URL` (already correct for the bundled compose file), `BETTER_AUTH_SECRET`, and SMTP credentials so verification emails can be delivered. Everything else is optional: with `PAYMENT_PROVIDER` empty the app grants each new user three months of free access, so the whole signup-to-dashboard path works before you set up billing.

Generate the auth secret with:

```bash
openssl rand -base64 32
```

## Make it yours

1. **Name and branding.** Edit `src/config/site.ts`: name, tagline, description, canonical URL, support email, brand colour. Every page title, email, navbar, and footer reads from it.
2. **Colours.** Edit the `--brand-*` tokens in `src/app/globals.css`, and keep `site.brandColor` in sync (email clients cannot read CSS variables, so the templates need the literal value).
3. **Icons and social card.** There is no `public/` directory and no image assets to swap out. Everything is generated from the site config: `src/app/icon.tsx` produces the favicon plus the 192 and 512 sizes the web manifest needs, `src/app/apple-icon.tsx` the iOS home-screen icon, `src/app/opengraph-image.tsx` the social preview card, and `src/app/manifest.ts` the web manifest itself. All of them rebrand automatically. See [Replacing the generated assets](#replacing-the-generated-assets) when you have real artwork.
4. **Plan.** Edit `PLAN` in `src/components/pricing/PricingCards.tsx` and the plan ids in `src/lib/payment/plans.ts`.
5. **Legal pages.** The privacy, terms, and refund pages are a starting point, not legal advice. Review them with a lawyer before taking real customers.
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
deploy/                Ansible playbooks and compose templates for production
```

## How the pieces work

### Authentication

Better Auth is mounted at `/api/auth`, backed by the same Postgres pool as the rest of the app. Email verification is required, so a new account stays inactive until the confirmation link is clicked.

`src/proxy.ts` handles route protection, but only optimistically: it checks that a session cookie is present, not that it is valid. Every protected page and route handler calls `getSessionUser()` itself, and that is what actually enforces access. Add new public routes to `PUBLIC_PATHS` there. Forgetting to is a fail-closed mistake, which is the safe direction.

One consequence is worth knowing up front: an anonymous visitor to a URL that does not exist is redirected to the login page rather than shown the 404 page, because the proxy cannot tell an unknown route from a protected one. Signed-in visitors get the real 404. That is deliberate, since it also stops anyone from enumerating which routes exist, but if you would rather always show the 404, add a catch-all to `PUBLIC_PATHS`.

`db/migrations/0001_auth.sql` is Better Auth's own generated schema. Do not hand-edit it. After changing the auth config or plugins, run the CLI against a running database and add what it reports as a new migration:

```bash
docker compose up -d
DATABASE_URL=... bunx @better-auth/cli generate --config src/lib/auth.ts
```

### Database

Any Postgres reachable through `DATABASE_URL`. `make migrate` applies `db/migrations/*.sql` in filename order and records what it applied in `schema_migrations`, each file in its own transaction. Re-running it is a no-op.

All SQL lives in `src/lib/repositories/`, one class per table, each taking a connection in its constructor so scripts and tests can pass their own pool. There is no per-user database role, so every read is written with an explicit `user_id` filter.

### Payments

`src/lib/payment/types.ts` defines the `PaymentProvider` interface. Paddle implements it in `paddle.ts`. To add Stripe or Lemon Squeezy: implement the interface, register it in `getPaymentProviderByName` in `provider.ts`, and add its signature header to `SIGNATURE_HEADERS` in `src/app/api/payments/webhook/route.ts`. Those three points are the only places that name a provider; the pages and the rest of the API never do.

That third step exists because an incoming webhook has to be attributed before it can be verified, and the only trustworthy signal is which signature header it carries. Reading `PAYMENT_PROVIDER` instead would break the day you switch providers, since subscriptions created under the old one keep sending events.

Two details worth understanding before you change anything here:

- **The webhook is the source of truth.** `/payment/success` deliberately activates nothing, because anyone can visit that URL. Access is granted when the signature-verified webhook arrives.
- **Webhooks are deduplicated.** A hash of the raw verified body is stored in `processed_webhook_events`. Signature verification proves authenticity but not freshness, so without this a replayed older event could resurrect cancelled access.

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

## Deployment

The app and the infrastructure it depends on are two independent compose stacks on the same host, each with its own playbook, so redeploying the app never restarts Postgres.

| Stack | Playbook            | Template                            | Triggered by                                     |
| ----- | ------------------- | ----------------------------------- | ------------------------------------------------ |
| Infra | `deploy/infra.yaml` | `deploy/tmpls/infra-compose.yml.j2` | the **Infra** workflow, manually                 |
| App   | `deploy/app.yaml`   | `deploy/tmpls/app-compose.yml.j2`   | the deploy job in `build.yml`, on push to `main` |

The infra stack holds the stateful services (Postgres and its backup sidecar) and owns the `app_network` Docker network. The app stack joins that network as an external network and reaches Postgres by hostname, so the database port is never published. Run the Infra workflow once before the first app deploy; `deploy/app.yaml` fails early with a clear error if the network is missing.

Migrations run from `deploy/app.yaml` after the app container starts, since the schema belongs to the app version being deployed rather than to the infra stack.

To enable deployment: point the inventory in both workflows at your server, add the secrets they reference, and uncomment the `deploy` job in `.github/workflows/build.yml`.

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

| Command         | What it does                                         |
| --------------- | ---------------------------------------------------- |
| `make dev`      | Start the dev server                                 |
| `make up`       | Start the local Postgres container                   |
| `make down`     | Stop it                                              |
| `make migrate`  | Apply pending migrations                             |
| `make db-shell` | Open `psql` against the local database               |
| `make local`    | Format, lint, and typecheck: run before every commit |
| `bun run build` | Production build                                     |

`bun scripts/grant-subscription.ts <userId> [months]` grants access manually, with no payment provider behind it. Useful for team accounts and support gestures.

## Notes on versions

- **TypeScript is pinned to 5.x, not 7.** `eslint-config-next` depends on `typescript-eslint` v8, which supports `typescript >=4.8.4 <6.1.0`. TypeScript 7 will work here once that peer range moves.
- **ESLint is pinned to 9, not 10.** `eslint-plugin-react`, bundled by `eslint-config-next`, crashes on ESLint 10 (`contextOrFilename.getFilename is not a function`).

## License

MIT. Use it for anything, including commercial work, with no attribution required.

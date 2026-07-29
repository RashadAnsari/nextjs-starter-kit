/**
 * Everything that identifies your product lives here, so renaming the app is a
 * single-file change. Anything user-facing (page titles, emails, the navbar,
 * the footer, legal pages) reads from this object rather than hardcoding a
 * name, a URL, or a colour.
 */
export const site = {
  name: "Acme",
  /** Used in <title> templates and email subjects. */
  tagline: "The Next.js starter kit for shipping SaaS fast",
  description:
    "A production-ready Next.js starter with authentication, Postgres, transactional email, object storage, subscriptions, and a one-command deploy.",
  /** Canonical origin, no trailing slash. Used by metadata, sitemap, and robots. */
  url: "https://example.com",
  /** Shown in the footer and used as the reply-to address for support. */
  supportEmail: "hello@example.com",
  /** Brand colour, mirrored by --brand-900 in globals.css. Emails cannot read CSS variables. */
  brandColor: "#1b6b4a",
} as const;

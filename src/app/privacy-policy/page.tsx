import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses, and protects your personal data, and the rights you have over it.`,
  alternates: { canonical: `${site.url}/privacy-policy` },
};

const LAST_UPDATED = "1 January 2026";

/**
 * A starting point, not legal advice. Section 1 needs your real legal entity and
 * registered address, section 5 must list the processors you actually use, and
 * section 7 must match the retention you actually apply. Under the GDPR an
 * inaccurate privacy policy is itself a compliance failure, so keep this true as
 * the stack changes. Have a lawyer review it, and appoint a data protection
 * officer if your processing requires one.
 */
const SECTIONS: LegalSection[] = [
  {
    title: "1. Who We Are",
    content: `${site.name} (${site.url}) is operated by [Legal Entity Name], registered at [Address, City, Country]. We are the data controller for the personal data described in this policy.`,
    footer: `For any question about this policy or the data we hold about you, contact ${site.supportEmail}.`,
  },
  {
    title: "2. What Personal Data We Collect",
    content: "We collect only what we need to run the service:",
    items: [
      {
        subtitle: "Account data",
        text: "Your name, email address, and a hashed password. We never store your password in a form we can read.",
      },
      {
        subtitle: "Authentication data",
        text: "Session records, including the session token, its expiry, and the IP address and browser user agent of the device that signed in.",
      },
      {
        subtitle: "Billing data",
        text: "A customer reference from our payment provider, your plan, its status, and its billing period. We never see or store your card number.",
      },
      {
        subtitle: "Content you submit",
        text: "Anything you upload or enter, stored so we can provide the service back to you.",
      },
      {
        subtitle: "Analytics data",
        text: "Anonymised usage statistics, and only if you accept analytics cookies. Nothing is collected before you do.",
      },
    ],
  },
  {
    title: "3. How We Use Your Data",
    items: [
      { text: "To create and maintain your account, and to authenticate you" },
      {
        text: "To send transactional email you need, such as account confirmation and password resets",
      },
      { text: "To provide the paid features your subscription unlocks" },
      { text: "To manage billing and meet our accounting and tax obligations" },
      { text: "To understand how the product is used, so we can improve it, where you consent" },
      { text: "To detect and prevent fraud, abuse, and security incidents" },
    ],
    footer:
      "We do not sell your personal data, and we do not use it to train machine learning models.",
  },
  {
    title: "4. Legal Basis for Processing (GDPR)",
    items: [
      {
        subtitle: "Performance of a contract",
        text: "Account data, authentication data, and content you submit are processed so we can provide the service you signed up for (Article 6(1)(b)).",
      },
      {
        subtitle: "Legal obligation",
        text: "Billing records are retained to meet tax and accounting law (Article 6(1)(c)).",
      },
      {
        subtitle: "Consent",
        text: "Analytics cookies are set only after you accept, and you may withdraw consent at any time (Article 6(1)(a)).",
      },
      {
        subtitle: "Legitimate interests",
        text: "Security, fraud prevention, and keeping the service reliable, balanced against your rights (Article 6(1)(f)).",
      },
    ],
  },
  {
    title: "5. Data Sharing and Processors",
    content:
      "We share data only with the providers that make the service work, each under a data processing agreement:",
    items: [
      { subtitle: "Hosting", text: "The provider running the application servers." },
      { subtitle: "Database", text: "The managed or self-hosted Postgres holding your account." },
      { subtitle: "Object storage", text: "The S3-compatible provider holding uploaded files." },
      { subtitle: "Email delivery", text: "The SMTP provider that sends transactional email." },
      {
        subtitle: "Payments",
        text: "Paddle, which acts as Merchant of Record and processes your payment details directly.",
      },
      { subtitle: "Analytics", text: "Google Analytics, loaded only with your consent." },
    ],
    footer:
      "Replace this list with the providers you actually use. Naming a processor you do not use, or omitting one you do, is itself a GDPR breach.",
  },
  {
    title: "6. International Data Transfers",
    content:
      "Some providers may process data outside the European Economic Area. Where that happens, the transfer is covered by an adequacy decision or by Standard Contractual Clauses approved by the European Commission, together with additional safeguards where required.",
  },
  {
    title: "7. Data Retention",
    items: [
      { subtitle: "Account data", text: "Kept for as long as your account exists." },
      {
        subtitle: "Session records",
        text: "Deleted when the session expires or when you sign out.",
      },
      {
        subtitle: "Billing records",
        text: "Kept for as long as tax law requires, typically seven years, even after account deletion.",
      },
      {
        subtitle: "Content you submit",
        text: "Deleted with your account, subject to backups being rotated out.",
      },
      {
        subtitle: "Deleted email addresses",
        text: "When an account is deleted we keep an irreversible cryptographic fingerprint of the email address, and nothing else, so that the address cannot be used to open a new account. The address itself is not retained and the fingerprint cannot be turned back into it. We keep this to prevent repeated use of free trials, which is our legitimate interest under Article 6(1)(f).",
      },
    ],
    footer:
      "When you delete your account we remove your personal data except where we are legally required to retain it. Backups are rotated on a fixed schedule, so a deleted record may persist in a backup until that rotation completes.",
  },
  {
    title: "8. Your Rights Under the GDPR",
    content: "You have the right to:",
    items: [
      { subtitle: "Access", text: "Ask for a copy of the personal data we hold about you." },
      { subtitle: "Rectification", text: "Have inaccurate or incomplete data corrected." },
      { subtitle: "Erasure", text: "Ask us to delete your data, where no legal duty requires it." },
      { subtitle: "Restriction", text: "Ask us to limit how we process your data." },
      {
        subtitle: "Portability",
        text: "Receive your data in a structured, machine-readable form.",
      },
      {
        subtitle: "Objection",
        text: "Object to processing based on our legitimate interests, and withdraw analytics consent at any time.",
      },
    ],
    footer: `Email ${site.supportEmail} to exercise any of these and we will respond within one month. You also have the right to lodge a complaint with your national data protection authority.`,
  },
  {
    title: "9. Cookies and Analytics",
    content:
      "We use a small number of strictly necessary cookies to keep you signed in, which need no consent because the service cannot work without them. Analytics cookies are different: nothing is loaded and no cookie is set until you accept the banner, and your choice is stored locally in your browser rather than in a cookie.",
    footer:
      "You can change or withdraw your choice at any time through the Cookie Preferences link in the footer.",
  },
  {
    title: "10. Security",
    content:
      "Passwords are hashed, all traffic is served over HTTPS with strict transport security, uploaded files are stored in a private bucket and served only through short-lived signed links, and a Content-Security-Policy restricts what the browser may load. Access to production systems is limited to those who need it.",
    footer:
      "No system is perfectly secure. If a breach affects your rights, we will notify you and the relevant supervisory authority as the GDPR requires.",
  },
  {
    title: "11. Children",
    content:
      "The service is not directed at children under 16, and we do not knowingly collect their personal data. If you believe a child has given us their data, contact us and we will delete it.",
  },
  {
    title: "12. Changes to This Policy",
    content:
      "We may update this policy. Material changes will be announced by email or a notice on the platform. The date at the top of this page always reflects the latest version.",
  },
  {
    title: "13. Contact",
    content: `For any privacy question or to exercise your rights, contact ${site.supportEmail}.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="We respect your privacy. This policy explains what personal data we collect, why we collect it, and how we protect it."
      sections={SECTIONS}
    />
  );
}

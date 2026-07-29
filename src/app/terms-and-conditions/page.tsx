import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";
import { COMPLIMENTARY_ACCESS_MONTHS } from "@/lib/payment/plans";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Read the ${site.name} terms and conditions. Understand your rights and responsibilities as a user.`,
  alternates: { canonical: `${site.url}/terms-and-conditions` },
};

const LAST_UPDATED = "1 January 2026";

/**
 * A starting point, not legal advice. Article 1 needs your real legal entity,
 * company registration number, and registered address before you take a single
 * customer, and Article 15 needs the jurisdiction you actually operate from.
 * Have a lawyer review the whole thing.
 */
const SECTIONS: LegalSection[] = [
  {
    title: "Article 1. General",
    content: `${site.name} (${site.url}) is an online platform operated by [Legal Entity Name], registered under company number [Registration Number], at [Address, City, Country].`,
    footer:
      "These Terms and Conditions apply to all use of the platform. By creating an account or using our services, you agree to them. Consumers may always invoke the mandatory provisions of their home country's law.",
  },
  {
    title: "Article 2. Eligibility",
    items: [
      {
        text: "You must be at least 16 years old to use the platform. By registering, you confirm that you meet this requirement.",
      },
      { text: "You must provide accurate and complete information when creating your account." },
      {
        text: "You are responsible for the security of your account credentials and for all activity that occurs under your account.",
      },
      {
        text: "You may not register an account on behalf of another person without their explicit consent.",
      },
    ],
  },
  {
    title: "Article 3. Our Services",
    content: "We provide the following services:",
    items: [
      { text: "Access to the platform's features under an account you control" },
      { text: "Subscription plans that unlock paid functionality" },
      { text: "Support by email for account and billing questions" },
    ],
    footer:
      "We reserve the right to update, add, or remove features at any time. We will notify you of changes that materially affect a paid service.",
  },
  {
    title: "Article 4. Free Trial and Complimentary Access",
    content:
      "We offer free access in two forms. Which one is available to you is shown on the pricing page before you claim it.",
    items: [
      {
        subtitle: "Free trial",
        text: "New users may start a free trial of the paid subscription. A valid payment method is required to begin the trial, but no charge is made during the trial period. Unless you cancel before the trial ends, your subscription renews automatically into a paid subscription at the then-current price. If you cancel during the trial, your access ends immediately and no charge is made. Each user is eligible for one free trial.",
      },
      {
        subtitle: "Complimentary access",
        text: `While the platform is in its early stages we may instead offer ${COMPLIMENTARY_ACCESS_MONTHS} months of complimentary access at no cost and without a payment method. Complimentary access is granted once per account, ends automatically when the period expires, and does not renew or convert into a paid subscription. No charge is ever made for it and you may stop using it at any time. Claiming it uses up your eligibility for the free trial, so a later paid subscription starts billing immediately.`,
      },
      {
        subtitle: "Changes to these offers",
        text: "We reserve the right to modify or withdraw either offer at any time with reasonable notice to registered users. Access already granted to you is not shortened by such a change.",
      },
    ],
  },
  {
    title: "Article 5. Subscriptions and Payments",
    content: `All payments are processed by Paddle.com Market Limited ("Paddle"), who acts as the Merchant of Record. This means Paddle is the legal seller for all transactions, handles VAT collection and remittance, and is responsible for payment processing and billing. By making a purchase, you also agree to Paddle's Terms of Service and Privacy Policy.`,
    items: [
      {
        subtitle: "Billing",
        text: "Subscriptions are billed on the same date each cycle until you cancel. Paddle will charge the payment method you provided at checkout.",
      },
      {
        subtitle: "Cancellation",
        text: `You may cancel at any time from the account settings page or by contacting ${site.supportEmail}. If you cancel a paid subscription, access continues until the end of the current billing period. If you cancel during the free trial, access ends immediately.`,
      },
      {
        subtitle: "Price changes",
        text: "We may change subscription prices with at least 30 days' written notice by email. You may cancel free of charge at any point before the new price takes effect, and the change will not apply to a billing period you have already paid for. If you do not cancel before it takes effect, your continued use constitutes acceptance.",
      },
      {
        subtitle: "Failed payments",
        text: "If a payment fails, Paddle will retry. If it remains unsuccessful, we may suspend access to your account until the issue is resolved. We will notify you by email.",
      },
      {
        subtitle: "Refunds",
        text: `EU and EEA consumers have a statutory 14-day right of withdrawal, which nothing in these Terms affects. Beyond that, we do not offer refunds ourselves. Because Paddle acts as Merchant of Record, all withdrawal requests, refund requests, and payment disputes are handled by Paddle under its Buyer Terms and Refund Policy. Our Refund Policy at ${site.url}/refund-policy sets out the full detail and governs in the event of any inconsistency with this article.`,
      },
    ],
  },
  {
    title: "Article 6. Acceptable Use",
    content: "You agree not to:",
    items: [
      { text: "Share your account credentials with others or resell access to the platform" },
      { text: "Copy, scrape, download, or redistribute content from the platform" },
      {
        text: "Use automated tools, bots, or scripts to interact with or extract data from the platform",
      },
      { text: "Upload, submit, or transmit offensive, illegal, harmful, or infringing content" },
      {
        text: "Attempt to reverse-engineer, decompile, hack, or otherwise disrupt the platform or its infrastructure",
      },
      {
        text: "Impersonate another person or entity, or misrepresent your identity or affiliation",
      },
    ],
    footer:
      "We may suspend or terminate an account that breaches these rules, without refund where the breach is serious.",
  },
  {
    title: "Article 7. Intellectual Property",
    content:
      "All content, software, design, and branding on the platform is owned by us or our licensors and is protected by copyright and other intellectual property law. Your subscription grants you a personal, non-exclusive, non-transferable right to use the platform for its intended purpose. It does not transfer ownership of anything.",
    footer:
      "Content you submit remains yours. By submitting it you grant us a limited licence to store and process it solely in order to provide the service to you.",
  },
  {
    title: "Article 8. Availability",
    content:
      "We work to keep the platform available and performing well, but we do not guarantee uninterrupted access. Access may be interrupted for maintenance, updates, or reasons outside our control. We are not liable for losses arising from temporary unavailability.",
  },
  {
    title: "Article 9. Liability",
    content:
      "To the extent permitted by law, our total liability to you is limited to the amount you paid us in the twelve months preceding the event giving rise to the claim. We are not liable for indirect or consequential loss, including lost profits, lost data, or lost opportunity.",
    footer:
      "Nothing in these Terms excludes liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be excluded.",
  },
  {
    title: "Article 10. Force Majeure",
    content:
      "We are not liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including outages at our hosting, database, email, storage, or payment providers, network failures, natural events, or governmental action.",
  },
  {
    title: "Article 11. Account Termination",
    content:
      "You may delete your account at any time by contacting us. We may suspend or terminate an account that breaches these Terms, that is used fraudulently, or where required by law. Where we terminate without cause, we refund the unused portion of any prepaid period.",
  },
  {
    title: "Article 12. Changes to These Terms",
    content:
      "We may amend these Terms. Material changes will be announced by email or a notice on the platform at least 30 days before they take effect. Continued use after that date constitutes acceptance. If you do not accept a change, you may cancel before it takes effect.",
  },
  {
    title: "Article 13. Disputes and Governing Law",
    content:
      "These Terms are governed by the law of [Jurisdiction]. We would always rather resolve a complaint directly, so please contact us first. Consumers may also use the European Commission's Online Dispute Resolution platform. Nothing here deprives a consumer of the protection of mandatory provisions of the law of their country of residence.",
  },
  {
    title: "Article 14. Contact",
    content: `For questions about these Terms, contact us at ${site.supportEmail}. For billing and payment questions, contact Paddle at paddle.net/support.`,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated={LAST_UPDATED}
      intro="These terms set out your rights and responsibilities when using the platform, and ours towards you."
      sections={SECTIONS}
    />
  );
}

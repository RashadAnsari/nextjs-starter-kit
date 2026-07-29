import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Read the ${site.name} refund policy. Understand how refunds and cancellations are handled for subscriptions.`,
  alternates: { canonical: `${site.url}/refund-policy` },
};

const LAST_UPDATED = "1 January 2026";

/**
 * Written for the Paddle integration this template ships with, where Paddle is
 * the Merchant of Record and therefore the legal seller. Swap the provider and
 * this page has to be rewritten: with Stripe you are the merchant of record and
 * you handle refunds yourself.
 *
 * A starting point, not legal advice. Have a lawyer review it before you take
 * real customers, and keep it true as the product changes.
 */
const SECTIONS: LegalSection[] = [
  {
    title: "1. Merchant of Record",
    content: `All payments on ${site.name} are processed by Paddle.com Market Limited ("Paddle"), who acts as the Merchant of Record. Paddle is the legal seller for all transactions and is solely responsible for processing payments, issuing invoices, and handling refund requests. By making a purchase, you agree to Paddle's Buyer Terms of Service.`,
  },
  {
    title: "2. Statutory Right of Withdrawal (EU and EEA Consumers)",
    content:
      "Your statutory rights come first, and nothing in this policy limits them. If you are a consumer in the European Union or European Economic Area, you have a statutory 14-day right of withdrawal under the EU Consumer Rights Directive (2011/83/EU). At checkout you expressly consent to delivery starting immediately and acknowledge that the right of withdrawal is lost once delivery of the digital content has begun, in accordance with Article 16(m) of the Directive. Where the law treats your subscription as an ongoing digital service rather than digital content, a withdrawal within 14 days entitles you to a refund reduced by a proportionate amount for the service already provided (Article 14(3) of the Directive). Free access is never charged for, so there is nothing to withdraw from during a free trial or a complimentary access period, and cancelling during one is always free.",
    footer:
      "You may contact Paddle within 14 days of purchase, or within 14 days of the end of a free trial, to request a withdrawal. Paddle will assess such requests in accordance with their Buyer Terms and Refund Policy.",
  },
  {
    title: "3. Discretionary Refunds",
    content: `Beyond the statutory right described above, ${site.name} itself does not offer refunds. We do not issue refunds for partially used subscription periods or unused access time. Paddle, as Merchant of Record, may at its sole discretion issue a refund if a request is submitted within 14 days of the transaction date, in accordance with Paddle's Refund Policy. Submitting a request within this period does not guarantee a discretionary refund, and it does not affect any statutory right you have. When you cancel a paid subscription, access continues until the end of the current paid billing period and no further charges are made.`,
  },
  {
    title: "4. How to Request a Refund",
    content: `Because Paddle is the Merchant of Record, all refund requests must be directed to Paddle, not to ${site.name}. You can reach Paddle via:`,
    items: [
      {
        subtitle: "Paddle's support portal",
        text: "Visit paddle.net/support to submit a refund or billing dispute request.",
      },
      {
        subtitle: "Your purchase receipt",
        text: "Every Paddle receipt email includes a link to manage or dispute your purchase directly.",
      },
      { subtitle: "Email", text: "Contact Paddle's buyer support at help@paddle.com." },
    ],
    footer: `If you believe a charge was unauthorised, contact Paddle first before disputing it with your bank or card provider: Paddle's Buyer Terms require this, and access to your purchase may be suspended while a chargeback is investigated. For general account questions that are not payment disputes, contact us at ${site.supportEmail}.`,
  },
  {
    title: "5. Refund Processing Time",
    content:
      "Where a refund is approved by Paddle, it is processed within 14 days of approval and returned to the original payment method where possible. The exact timing may vary depending on your bank or card provider.",
  },
  {
    title: "6. Cancellation",
    content: `You may cancel your subscription at any time from the account settings page or by contacting ${site.supportEmail}. Cancellation stops future billing. If you cancel during the free trial, your access ends immediately and no charge is made. If you cancel a paid subscription, you retain access to paid features until the end of the current billing period. Cancellation on its own does not entitle you to a refund of the current period, without prejudice to the statutory right of withdrawal described in section 2.`,
  },
  {
    title: "7. Changes to This Policy",
    content:
      "We may update this Refund Policy from time to time. We will notify you of material changes by email or via a notice on the platform. The date at the top of this page always reflects the latest version.",
  },
  {
    title: "8. Contact",
    content: `For billing and payment questions, contact Paddle at paddle.net/support. For all other enquiries, reach us at ${site.supportEmail}.`,
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated={LAST_UPDATED}
      intro={`All payments on ${site.name} are processed by Paddle, who acts as Merchant of Record and handles all refund requests.`}
      sections={SECTIONS}
    />
  );
}

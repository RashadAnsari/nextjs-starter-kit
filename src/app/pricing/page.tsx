import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingCards } from "@/components/pricing/PricingCards";
import { site } from "@/config/site";

const DESCRIPTION = `Start free, then €9 a month. Every feature included, cancel anytime.`;

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: `${site.url}/pricing` },
  openGraph: {
    title: `Pricing | ${site.name}`,
    description: DESCRIPTION,
    url: `${site.url}/pricing`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Pricing | ${site.name}`,
    description: DESCRIPTION,
  },
};

/** Rewrite these for your own product. They also feed the FAQ rich result. */
const FAQS = [
  {
    question: "How does the free trial work?",
    answer:
      "Starting a trial gives you full access to every feature. You add a payment method at signup but are not charged during the trial. When it ends your subscription renews automatically at the listed price unless you cancel first.",
  },
  {
    question: "What happens if I cancel during the trial?",
    answer:
      "Your access ends immediately and you are never charged. If you cancel later, while on a paid subscription, you keep access until the end of the billing period you have already paid for.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, from your account settings, in one click. Cancelling stops all future charges. There is no cancellation fee and you do not need to contact support.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Consumers in the EU and EEA have a statutory 14-day right of withdrawal, which we always honour. Beyond that, payments are handled by Paddle as Merchant of Record and refund requests go to them. Our Refund Policy sets out the detail.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "All major credit and debit cards, plus the local methods Paddle supports in your country. Every payment is processed securely by Paddle and we never see your card details.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Passwords are hashed, traffic is encrypted in transit, and uploaded files live in a private bucket reachable only through short-lived signed links. See our Privacy Policy for what we store and why.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Marks the questions below as an FAQ so search engines can show them
          directly in results. Keep it in sync with FAQS or drop both. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />

      <div className="container pt-12 pb-10 text-center sm:pt-16 sm:pb-12">
        <h1 className="mb-4 text-[clamp(1.75rem,6vw,2.5rem)] font-bold text-[var(--gray-900)]">
          Simple, honest pricing
        </h1>
        <p className="mx-auto max-w-[640px] text-xl text-[var(--gray-600)]">{DESCRIPTION}</p>
      </div>

      <div className="container pb-20">
        <PricingCards />
      </div>

      <div className="mx-auto max-w-[800px] px-6 pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold text-[var(--gray-900)]">
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-[var(--gray-200)] bg-white p-4 sm:p-6"
            >
              <h3 className="mb-3 text-lg font-semibold text-[var(--gray-900)]">{faq.question}</h3>
              <p className="leading-relaxed text-[var(--gray-600)]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

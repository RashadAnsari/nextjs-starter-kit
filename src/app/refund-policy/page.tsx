import { LegalPage, LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";

export const metadata = { title: "Refund Policy" };

/**
 * A starting point, not legal advice. Consumer law in your market may grant
 * rights beyond what is written here. Review it with a lawyer.
 */
export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" lastUpdated="1 January 2026">
      <LegalSection heading="Free trial">
        <p>
          Every new subscription starts with a free trial. Cancel before it ends and you are never
          charged. That is the best way to decide whether the product is right for you.
        </p>
      </LegalSection>

      <LegalSection heading="Refunds">
        <p>
          If you are unhappy with a payment, email us within 14 days of the charge and we will
          refund it. We do not require a reason, though we always appreciate hearing what went
          wrong.
        </p>
        <p>
          Refunds are issued to the original payment method and usually appear within five to ten
          business days, depending on your bank.
        </p>
      </LegalSection>

      <LegalSection heading="Cancellation">
        <p>
          You can cancel at any time from your settings page. Cancelling stops future charges and
          your access continues until the end of the period you have already paid for. We do not
          prorate partial periods.
        </p>
      </LegalSection>

      <LegalSection heading="How to reach us">
        <p>
          Email{" "}
          <a href={`mailto:${site.supportEmail}`} className="font-medium text-[var(--brand-900)]">
            {site.supportEmail}
          </a>{" "}
          from the address on your account and we will take it from there.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

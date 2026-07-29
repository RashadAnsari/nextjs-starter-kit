import { LegalPage, LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";

export const metadata = { title: "Terms and Conditions" };

/**
 * A starting point, not legal advice. Review this with a lawyer before you take
 * real customers, and keep it accurate as the product changes.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions" lastUpdated="1 January 2026">
      <LegalSection heading="Agreement">
        <p>
          By creating an account or using {site.name} you agree to these terms. If you do not agree
          with them, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You are responsible for keeping your password secure and for everything that happens under
          your account. Tell us immediately if you believe your account has been accessed by someone
          else. You must be old enough to enter a contract in your country to use the service.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Do not use the service to break the law, to infringe anyone else&apos;s rights, to send
          unsolicited messages, or to attempt to disrupt or gain unauthorised access to our systems.
          We may suspend an account that does.
        </p>
      </LegalSection>

      <LegalSection heading="Subscriptions and payment">
        <p>
          Paid plans renew automatically at the end of each billing period until you cancel. You can
          cancel at any time from your settings page, and your access continues until the end of the
          period you have already paid for. Prices may change, and we will tell you before a change
          affects you.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p>
          We work to keep the service available, but we do not guarantee uninterrupted access. We
          may change or discontinue features, and we will give reasonable notice of anything
          significant.
        </p>
      </LegalSection>

      <LegalSection heading="Liability">
        <p>
          The service is provided as is. To the extent the law allows, our total liability to you is
          limited to the amount you paid us in the twelve months before the claim arose.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms can go to{" "}
          <a href={`mailto:${site.supportEmail}`} className="font-medium text-[var(--brand-900)]">
            {site.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

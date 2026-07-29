import { LegalPage, LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/config/site";

export const metadata = { title: "Privacy Policy" };

/**
 * A starting point, not legal advice. Review this with a lawyer before you take
 * real customers, and keep it accurate as the product changes.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="1 January 2026">
      <LegalSection heading="Who we are">
        <p>
          {site.name} operates this website and service. If you have any question about this policy
          or about the data we hold, contact us at{" "}
          <a href={`mailto:${site.supportEmail}`} className="font-medium text-[var(--brand-900)]">
            {site.supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          When you create an account we store your name, email address, and a hashed password. We
          never store your password in a form we can read.
        </p>
        <p>
          If you subscribe, our payment provider processes your payment details. We receive only a
          customer reference, the plan, and the status of your subscription. We never see your card
          number.
        </p>
        <p>
          With your consent we collect anonymised usage statistics through Google Analytics. You can
          withdraw that consent at any time through the Cookie Preferences link in the footer.
        </p>
      </LegalSection>

      <LegalSection heading="Why we collect it">
        <p>
          We use your account data to provide the service, to authenticate you, and to send
          transactional email such as account confirmation and password resets. We use billing data
          to manage your subscription and to meet our accounting obligations. We use analytics to
          understand how the product is used so we can improve it.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          We share data only with the providers that make the service work: our hosting provider,
          our database and object storage provider, our email delivery provider, our payment
          provider, and our analytics provider. We do not sell your data to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          We keep your account data for as long as your account exists. Billing records are kept for
          as long as tax law requires. When you delete your account we remove your personal data,
          except where we are legally required to retain it.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can request access to your data, correction of it, a copy of it, or its deletion.
          Email us and we will respond within 30 days.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

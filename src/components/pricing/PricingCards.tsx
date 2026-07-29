import {
  CheckIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CreditCardIcon,
} from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/Button";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";
import { ClaimAccessButton } from "@/components/pricing/ClaimAccessButton";
import { site } from "@/config/site";
import { getSessionUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/payment/subscription";
import { hasPremiumAccess, isTrialEligible, DEFAULT_PLAN_ID } from "@/lib/payment/plans";
import { withNext } from "@/lib/redirects";

/** Everything the pricing card says. Rewrite this for your own product. */
export const PLAN = {
  id: DEFAULT_PLAN_ID,
  name: "Monthly plan",
  badge: "7-day free trial",
  // Shown while no payment provider is configured, when claiming grants
  // complimentary access instead of a trial.
  badgeComplimentary: "Free early access",
  headline: "Everything included, one price",
  price: "€9",
  priceNote: "/ month",
  subNote: "7 days free, then €9 / month. Cancel anytime.",
  subNoteComplimentary:
    "Full access while we are in early access, free and with no payment method. It ends on its own and never turns into a paid plan.",
  subNoteReturning: "Billed monthly. Cancel anytime.",
  features: [
    { text: "Unlimited projects" },
    { text: "Every feature, no tiers to compare" },
    { text: "Priority email support" },
    { text: "Cancel anytime, keep access to the end of the period" },
  ],
  cta: "Start free trial",
  ctaComplimentary: "Claim free access",
  ctaReturning: "Subscribe",
  ctaVariant: "primary" as const,
} as const;

/** Fallback when access cannot be granted and there is no checkout to send them to. */
export const CONTACT_MAILTO = `mailto:${site.supportEmail}?subject=${encodeURIComponent(`${PLAN.name} subscription`)}&body=${encodeURIComponent(`Hi,\n\nI'm interested in the ${PLAN.name} (${PLAN.price} ${PLAN.priceNote}).\n\nCould you help me get started?\n\nThanks`)}`;

export async function PricingCards() {
  const user = await getSessionUser();

  const loggedIn = !!user;
  const providerConfigured = !!process.env.PAYMENT_PROVIDER;
  // With no provider, claiming grants complimentary access instead of a trial.
  // The offer drives the copy, so a signed-out visitor sees what they would
  // actually get; loggedIn only decides which button runs.
  const complimentaryOffer = !providerConfigured;
  const claimComplimentary = loggedIn && !providerConfigured;

  let hasActiveSubscription = false;
  // A signed-out visitor is treated as trial-eligible, since most are new. A
  // returning customer who already used the trial is billed immediately.
  let trialEligible = true;
  if (user) {
    const sub = await getUserSubscription(user.id);
    hasActiveSubscription = hasPremiumAccess(sub);
    trialEligible = isTrialEligible(sub);
  }

  return (
    <div className="mx-auto max-w-[1040px]">
      <div className="grid overflow-hidden rounded-2xl border-2 border-[var(--brand-900)] shadow-[0_16px_40px_rgba(27,107,74,0.14),0_2px_8px_rgba(0,0,0,0.04)] md:grid-cols-2">
        {/* Offer */}
        <div className="flex flex-col bg-white p-8 sm:p-10">
          {trialEligible && (
            <span className="mb-6 inline-flex self-start items-center rounded-full bg-[var(--brand-50)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--brand-700)]">
              {complimentaryOffer ? PLAN.badgeComplimentary : PLAN.badge}
            </span>
          )}

          <h2 className="mb-5 text-2xl font-bold text-[var(--gray-900)]">{PLAN.headline}</h2>

          <div className="flex items-end gap-1.5">
            <span className="text-[3.5rem] font-bold leading-none text-[var(--brand-900)]">
              {PLAN.price}
            </span>
            <span className="mb-2 text-base text-[var(--brand-700)]">{PLAN.priceNote}</span>
          </div>
          <p className="mt-3 text-sm text-[var(--gray-600)]">
            {!trialEligible
              ? PLAN.subNoteReturning
              : complimentaryOffer
                ? PLAN.subNoteComplimentary
                : PLAN.subNote}
          </p>

          <div className="mt-auto pt-8">
            <PlanCta
              loggedIn={loggedIn}
              claimComplimentary={claimComplimentary}
              complimentaryOffer={complimentaryOffer}
              hasActiveSubscription={hasActiveSubscription}
              trialEligible={trialEligible}
            />
            {!hasActiveSubscription && trialEligible && (
              <p className="mt-3 text-center text-xs text-[var(--gray-500)]">
                {complimentaryOffer ? "No payment method needed" : "No charge during your trial"}
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="bg-[var(--brand-50)] p-8 sm:p-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-[var(--brand-700)]">
            Everything included
          </p>
          <ul className="flex flex-col gap-4">
            {PLAN.features.map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--brand-700)]">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <span className="leading-normal text-[var(--gray-800)]">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <TrustItem icon={<ShieldCheckIcon className="h-4 w-4" />} text="Secure checkout" />
        <TrustItem icon={<ArrowPathIcon className="h-4 w-4" />} text="Cancel anytime" />
        <TrustItem icon={<CreditCardIcon className="h-4 w-4" />} text="All major cards accepted" />
      </div>
    </div>
  );
}

function PlanCta({
  loggedIn,
  claimComplimentary,
  complimentaryOffer,
  hasActiveSubscription,
  trialEligible,
}: {
  loggedIn: boolean;
  claimComplimentary: boolean;
  complimentaryOffer: boolean;
  hasActiveSubscription: boolean;
  trialEligible: boolean;
}) {
  if (hasActiveSubscription) {
    return (
      <Button href="/dashboard" variant={PLAN.ctaVariant} fullWidth>
        Go to dashboard
      </Button>
    );
  }

  const ctaLabel = !trialEligible
    ? PLAN.ctaReturning
    : complimentaryOffer
      ? PLAN.ctaComplimentary
      : PLAN.cta;

  // A signed-out visitor on the pricing page is a prospect, so send them to
  // signup rather than login. `next` brings them back here once the account is
  // live, and the signup page links to login for returning users.
  if (!loggedIn) {
    return (
      <Button href={withNext("/auth/signup", "/pricing")} variant={PLAN.ctaVariant} fullWidth>
        {ctaLabel}
      </Button>
    );
  }

  if (claimComplimentary) {
    return (
      <ClaimAccessButton contactHref={CONTACT_MAILTO} variant={PLAN.ctaVariant} fullWidth>
        {ctaLabel}
      </ClaimAccessButton>
    );
  }

  return (
    <CheckoutButton planId={PLAN.id} variant={PLAN.ctaVariant} fullWidth>
      {ctaLabel}
    </CheckoutButton>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
      <span className="text-[var(--brand-700)]">{icon}</span>
      {text}
    </div>
  );
}

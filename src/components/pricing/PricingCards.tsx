import { CheckIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/Button";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";
import { ClaimAccessButton } from "@/components/pricing/ClaimAccessButton";
import { COMPLIMENTARY_ACCESS_MONTHS, DEFAULT_PLAN_ID } from "@/lib/payment/plans";

/** Edit these to describe your own plan. */
const PLAN = {
  name: "Pro",
  price: "€9",
  cadence: "per month",
  features: [
    "Everything in the free tier",
    "Unlimited projects",
    "Priority email support",
    "Cancel anytime",
  ],
};

interface Props {
  /** True when the visitor already has an active subscription. */
  hasAccess: boolean;
  /** True when a payment provider is configured for this deployment. */
  billingEnabled: boolean;
}

export function PricingCards({ hasAccess, billingEnabled }: Props) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card border-2 border-[var(--brand-900)]">
        <h2 className="text-xl font-semibold text-[var(--gray-900)]">{PLAN.name}</h2>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[var(--gray-900)]">{PLAN.price}</span>
          <span className="text-sm text-[var(--gray-500)]">{PLAN.cadence}</span>
        </div>

        <ul className="mt-6 flex flex-col gap-3">
          {PLAN.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-[var(--gray-700)]">
              <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-700)]" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {hasAccess ? (
            <Button href="/dashboard" fullWidth>
              Go to dashboard
            </Button>
          ) : billingEnabled ? (
            <CheckoutButton planId={DEFAULT_PLAN_ID} fullWidth>
              Start free trial
            </CheckoutButton>
          ) : (
            <ClaimAccessButton>Get {COMPLIMENTARY_ACCESS_MONTHS} months free</ClaimAccessButton>
          )}
        </div>

        {!billingEnabled && (
          <p className="mt-4 text-center text-xs text-[var(--gray-500)]">
            Billing is not configured yet, so access is free for now.
          </p>
        )}
      </div>
    </div>
  );
}

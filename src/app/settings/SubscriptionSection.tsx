"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SuccessBanner } from "@/components/ui/SuccessBanner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { analytics } from "@/lib/analytics";
import { PLAN_LABEL, type UserSubscription } from "@/lib/payment/plans";
import type { ProviderPayment } from "@/lib/payment/types";
import { SettingsSection, SettingsItem } from "./SettingsSection";

type SubscriptionInfo = UserSubscription & { hasAccess: boolean };

export function SubscriptionSection() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [payments, setPayments] = useState<ProviderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [subRes, paymentsRes] = await Promise.all([
        fetch("/api/payments/subscription"),
        fetch("/api/payments"),
      ]);
      if (subRes.ok) {
        setSub(await subRes.json());
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const isTrialing = sub?.status === "trialing";

  async function handleCancel() {
    const message = isTrialing
      ? "Are you sure you want to cancel your free trial? You'll lose access immediately."
      : "Are you sure you want to cancel your subscription? You'll keep access until the end of your current billing period.";
    if (!confirm(message)) {
      return;
    }
    setCancelling(true);
    setCancelError(null);
    const res = await fetch("/api/payments/subscription/cancel", { method: "POST" });
    setCancelling(false);
    if (res.ok) {
      analytics.cancelSubscription();
      if (isTrialing) {
        setCancelSuccess("Your free trial has been cancelled and access has ended.");
        setSub((prev) =>
          prev
            ? { ...prev, status: "cancelled", currentPeriodEnd: new Date(), hasAccess: false }
            : prev
        );
      } else {
        setCancelSuccess(
          "Your subscription has been cancelled. Access continues until the end of your billing period."
        );
        setSub((prev) => (prev ? { ...prev, cancelAtPeriodEnd: true } : prev));
      }
    } else {
      const data = await res.json();
      setCancelError(data.error ?? "Failed to cancel subscription. Please try again.");
    }
  }

  const isSubscribed = !!sub?.planId;
  const hasAccess = !!sub?.hasAccess;
  // Only provider-backed active or trialing subscriptions can be cancelled, and
  // only while access is live and a cancellation is not already scheduled.
  const canCancel =
    hasAccess &&
    !!sub?.paymentProvider &&
    (sub.status === "active" || sub.status === "trialing") &&
    !sub.cancelAtPeriodEnd;
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  function planDescription() {
    if (!isSubscribed || !periodEnd) {
      return "No active plan";
    }

    const formatted = periodEnd.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (!hasAccess) {
      return "Access ended";
    }
    if (isTrialing) {
      return sub.cancelAtPeriodEnd
        ? `Free trial cancels on ${formatted}`
        : `Free trial ends ${formatted}, then renews to the ${PLAN_LABEL} plan`;
    }
    if (sub.cancelAtPeriodEnd) {
      return `Cancels on ${formatted}`;
    }
    if (!sub.paymentProvider) {
      return `Ends on ${formatted}`;
    }
    return `Renews on ${formatted}`;
  }

  return (
    <SettingsSection title="Subscription" description="Your current plan and billing history">
      <SuccessBanner message={cancelSuccess} onHide={() => setCancelSuccess(null)} />
      <ErrorBanner message={cancelError} onHide={() => setCancelError(null)} />

      {loading ? (
        <p className="text-sm text-[var(--gray-500)]">Loading…</p>
      ) : (
        <>
          <SettingsItem
            label={
              <div className="flex flex-wrap items-center gap-2">
                <span>Current plan</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    hasAccess
                      ? "bg-[var(--brand-50)] text-[var(--brand-900)]"
                      : "bg-[var(--gray-100)] text-[var(--gray-600)]"
                  }`}
                >
                  {isSubscribed ? PLAN_LABEL : "No plan"}
                </span>
              </div>
            }
            description={planDescription()}
          >
            <div className="flex flex-wrap items-center gap-3">
              {canCancel ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : isTrialing ? "Cancel trial" : "Cancel plan"}
                </Button>
              ) : (
                !hasAccess && (
                  <Button href="/pricing" variant="primary">
                    Subscribe
                  </Button>
                )
              )}
            </div>
          </SettingsItem>

          <div className="mt-6">
            <p className="mb-3 text-[0.9375rem] font-semibold text-[var(--gray-900)]">
              Payment history
            </p>
            {payments.length === 0 ? (
              <p className="text-sm text-[var(--gray-400)]">No payments yet</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--gray-100)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--gray-50)]">
                      <th className="px-4 py-3 text-left font-medium text-[var(--gray-500)]">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--gray-500)]">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--gray-500)]">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--gray-500)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.providerPaymentId} className="border-t border-[var(--gray-100)]">
                        <td className="px-4 py-3 text-[var(--gray-700)]">
                          {p.paidAt
                            ? new Date(p.paidAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-[var(--gray-700)]">{p.description}</td>
                        <td className="px-4 py-3 text-[var(--gray-700)]">
                          {(p.amountCents / 100).toLocaleString(undefined, {
                            style: "currency",
                            currency: p.currency,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              p.status === "paid"
                                ? "bg-[var(--brand-50)] text-[var(--brand-900)]"
                                : p.status === "refunded"
                                  ? "bg-[var(--gray-100)] text-[var(--gray-600)]"
                                  : "bg-[var(--red-light)] text-[var(--red)]"
                            }`}
                          >
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}

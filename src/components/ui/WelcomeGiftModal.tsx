"use client";

import { useEffect, useState } from "react";
import { GiftIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";

/**
 * Where the pricing CTA goes after claiming access. The flag is what tells the
 * dashboard to show the modal, since the grant already happened by then.
 */
export const WELCOME_GIFT_REDIRECT = "/dashboard?welcome=1";

/**
 * Tells a user, once, what complimentary access gave them: how long, that it
 * costs nothing, and that it will not turn into a paid plan.
 */
export function WelcomeGiftModal({ months }: { months: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the overlay from scrolling.
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const monthsLabel = `${months} ${months === 1 ? "month" : "months"}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-gift-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-50)]">
          <GiftIcon className="h-7 w-7 text-[var(--brand-700)]" aria-hidden="true" />
        </span>

        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--brand-700)]">
          Welcome gift
        </p>
        <h2 id="welcome-gift-title" className="mb-3 text-2xl font-bold text-[var(--gray-900)]">
          {monthsLabel} on us
        </h2>
        <p className="mb-6 leading-relaxed text-[var(--gray-600)]">
          {site.name} is in early access, so your account has {monthsLabel} of everything included,
          free and with no payment method. It ends on its own and never turns into a paid plan.
        </p>

        {/* Focused on open so the keyboard lands inside the dialog. */}
        <Button autoFocus fullWidth onClick={() => setOpen(false)}>
          Get started
        </Button>
      </div>
    </div>
  );
}

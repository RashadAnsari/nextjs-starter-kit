import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata = { title: "Payment complete" };

/**
 * Where the provider sends the customer after checkout. It deliberately does
 * not activate anything: the subscription becomes active when the signed
 * webhook arrives, which can be a moment later. Treating this page as proof of
 * payment would let anyone grant themselves access by visiting the URL.
 */
export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="container flex flex-1 items-center justify-center py-24">
        <div className="max-w-[520px] text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-[var(--brand-700)]" />
          <h1 className="mt-6 text-3xl font-bold text-[var(--gray-900)]">Payment complete</h1>
          <p className="mt-3 text-lg leading-relaxed text-[var(--gray-600)]">
            Thank you. Your subscription is being activated and will be ready in a moment. You will
            receive a receipt by email.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
            <Link href="/settings" className="btn btn-outline">
              View subscription
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

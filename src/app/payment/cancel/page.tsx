import Link from "next/link";
import { XCircleIcon } from "@heroicons/react/24/outline";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { site } from "@/config/site";

export const metadata = { title: "Checkout cancelled" };

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="container flex flex-1 items-center justify-center py-24">
        <div className="max-w-[520px] text-center">
          <XCircleIcon className="mx-auto h-16 w-16 text-[var(--gray-400)]" />
          <h1 className="mt-6 text-3xl font-bold text-[var(--gray-900)]">Checkout cancelled</h1>
          <p className="mt-3 text-lg leading-relaxed text-[var(--gray-600)]">
            No payment was taken and nothing has changed on your account. You can pick up where you
            left off whenever you are ready.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/pricing" className="btn btn-primary">
              Back to pricing
            </Link>
            <a href={`mailto:${site.supportEmail}`} className="btn btn-outline">
              Contact support
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

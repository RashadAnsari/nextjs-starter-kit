import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { site } from "@/config/site";

interface Props {
  children: React.ReactNode;
  backLink?: boolean;
}

/** The centred card every auth page renders inside. */
export function AuthCard({ children, backLink }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-[var(--gray-50)]">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="text-2xl font-bold text-[var(--brand-900)]">
            {site.name}
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-[var(--gray-200)]">
          {children}
        </div>

        {backLink && (
          <div className="text-center mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gray-600)]"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

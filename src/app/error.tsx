"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

/**
 * Catches render and data errors anywhere below the root layout. Without it an
 * unhandled error shows Next.js's unstyled default screen, which in production
 * is a blank page with no way back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporting service. The digest is the only handle
    // on the real message: Next.js strips it from production client bundles so
    // that server-side details cannot leak to the browser.
    console.error("[error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-[520px] text-center">
          <h1 className="text-3xl font-bold text-[var(--gray-900)]">Something went wrong</h1>
          <p className="mt-3 text-lg leading-relaxed text-[var(--gray-500)]">
            The page could not be loaded. Trying again often fixes it.
          </p>
          {error.digest && (
            <p className="mt-4 text-sm text-[var(--gray-400)]">
              Reference: <code>{error.digest}</code>
            </p>
          )}

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset}>Try again</Button>
            <Link href="/" className="btn btn-outline">
              Go to homepage
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

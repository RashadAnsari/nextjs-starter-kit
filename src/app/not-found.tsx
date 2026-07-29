import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-[560px]">
          <div
            className="font-bold mb-2 select-none text-[var(--brand-50)]"
            style={{
              fontSize: "clamp(6rem, 20vw, 10rem)",
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            404
          </div>

          <h1 className="text-3xl font-bold mb-3 mt-6 text-[var(--gray-900)]">Page not found</h1>
          <p className="mb-10 text-lg leading-relaxed text-[var(--gray-500)]">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn btn-primary">
              Go to homepage
            </Link>
            <Link href="/dashboard" className="btn btn-outline">
              Go to dashboard
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

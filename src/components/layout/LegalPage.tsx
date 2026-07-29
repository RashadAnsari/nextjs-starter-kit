import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Shared shell for the policy pages, so they stay visually identical and a
 * change to the layout happens in one place.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--gray-900)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">Last updated: {lastUpdated}</p>

        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold text-[var(--gray-900)]">{heading}</h2>
      <div className="flex flex-col gap-3 leading-relaxed text-[var(--gray-700)]">{children}</div>
    </section>
  );
}

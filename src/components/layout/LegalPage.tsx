import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * One clause of a policy: prose, enumerated points beneath it, and a closing
 * qualification in smaller italics, where caveats and statutory carve-outs go.
 */
export interface LegalSection {
  title: string;
  content?: string;
  items?: { subtitle?: string; text: string }[];
  footer?: string;
}

/** Shared shell for the privacy, terms, and refund pages, which supply only data. */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <Navbar />

      <div className="container py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--gray-900)]">{title}</h1>
        <p className="text-sm text-[var(--gray-500)]">Last updated: {lastUpdated}</p>
        <p className="mx-auto mt-4 max-w-[680px] text-lg text-[var(--gray-600)]">{intro}</p>
      </div>

      <div className="mx-auto flex max-w-[800px] flex-col gap-6 px-6 pb-20">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-[var(--gray-200)] bg-white p-8"
          >
            <h2 className="mb-4 text-lg font-semibold text-[var(--gray-900)]">{section.title}</h2>

            {section.content && (
              <p className="mb-4 leading-relaxed text-[var(--gray-600)]">{section.content}</p>
            )}

            {section.items && (
              <ul className="mb-4 flex flex-col gap-3">
                {section.items.map((item) => (
                  <li key={item.text} className="flex gap-3 leading-relaxed text-[var(--gray-600)]">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-50)] text-xs font-bold text-[var(--brand-700)]">
                      ✓
                    </span>
                    <span>
                      {item.subtitle ? (
                        <>
                          <strong className="text-[var(--gray-800)]">{item.subtitle}</strong>
                          {": "}
                          {item.text}
                        </>
                      ) : (
                        item.text
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {section.footer && (
              <p className="mt-2 text-sm italic leading-relaxed text-[var(--gray-500)]">
                {section.footer}
              </p>
            )}
          </section>
        ))}
      </div>

      <Footer />
    </div>
  );
}

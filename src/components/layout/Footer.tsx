import Link from "next/link";
import { CookiePreferencesLink } from "@/components/layout/CookiePreferencesLink";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-[var(--gray-900)] text-[var(--gray-400)]">
      <div className="container pt-12 pb-8">
        <div className="flex justify-center mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
            <div>
              <div className="mb-4">
                <Link href="/" className="font-semibold text-sm text-white">
                  {site.name}
                </Link>
              </div>
              <p className="text-sm leading-relaxed">{site.description}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Info</h4>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Plans &amp; Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="hover:text-white transition-colors">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <CookiePreferencesLink />
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Contact</h4>
              <p className="text-sm mb-2">Have a question or need help?</p>
              <a
                href={`mailto:${site.supportEmail}`}
                className="text-sm text-[var(--brand-500)] hover:text-white transition-colors"
              >
                {site.supportEmail}
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 text-center text-sm border-t border-[var(--gray-800)]">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

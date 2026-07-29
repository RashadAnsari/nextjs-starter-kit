import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ConsentBanner } from "@/components/ui/ConsentBanner";
import { site } from "@/config/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  // The og:image and twitter:image tags are injected by Next.js from
  // src/app/opengraph-image.tsx, so they are deliberately absent here.
  openGraph: {
    siteName: site.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Empty when analytics is not configured, which also hides the consent banner:
  // with nothing to consent to, asking would be noise.
  const gaMeasurementId = process.env.ANALYTICS_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen" suppressHydrationWarning>
        {children}
        {gaMeasurementId && (
          <>
            <GoogleAnalytics measurementId={gaMeasurementId} />
            <ConsentBanner measurementId={gaMeasurementId} />
          </>
        )}
      </body>
    </html>
  );
}

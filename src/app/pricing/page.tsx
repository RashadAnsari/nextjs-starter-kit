import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingCards } from "@/components/pricing/PricingCards";
import { getSessionUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/payment/subscription";
import { hasPremiumAccess } from "@/lib/payment/plans";

export const metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Cancel anytime.",
};

export default async function PricingPage() {
  const user = await getSessionUser();
  const subscription = user ? await getUserSubscription(user.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="container flex-1 py-16">
        <div className="section-header">
          <h1 className="section-title">Simple, transparent pricing</h1>
          <p className="section-subtitle">One plan, everything included. Cancel anytime.</p>
        </div>

        <PricingCards
          hasAccess={!!subscription && hasPremiumAccess(subscription)}
          billingEnabled={!!process.env.PAYMENT_PROVIDER}
        />
      </main>

      <Footer />
    </div>
  );
}

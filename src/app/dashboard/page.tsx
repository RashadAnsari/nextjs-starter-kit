import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { getUserSubscription, grantComplimentaryAccess } from "@/lib/payment/subscription";
import { hasPremiumAccess, PLAN_LABEL } from "@/lib/payment/plans";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The proxy already bounced anonymous visitors, but it only checks that a
  // cookie exists. This is the check that actually enforces access.
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login?next=%2Fdashboard");
  }

  // No-op once a payment provider is configured; before then it gives new
  // accounts a working, time-limited plan.
  await grantComplimentaryAccess(user.id);

  const subscription = await getUserSubscription(user.id);
  const hasAccess = hasPremiumAccess(subscription);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      <Navbar />

      <main className="flex-1 container py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[var(--gray-900)]">
            Welcome back, {user.name || user.email}
          </h1>
          <p className="text-[var(--gray-600)]">Here is what is going on with your account.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card">
            <p className="text-sm font-medium text-[var(--gray-500)]">Plan</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gray-900)]">
              {subscription.planId ? PLAN_LABEL : "None"}
            </p>
            <p className="mt-2 text-sm text-[var(--gray-600)]">
              {hasAccess ? "Your subscription is active." : "You have no active subscription."}
            </p>
            {!hasAccess && (
              <div className="mt-4">
                <Button href="/pricing" size="sm">
                  See plans
                </Button>
              </div>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-medium text-[var(--gray-500)]">Email</p>
            <p className="mt-1 truncate text-lg font-semibold text-[var(--gray-900)]">
              {user.email}
            </p>
            <p className="mt-2 text-sm text-[var(--gray-600)]">
              {user.emailVerified ? "Verified" : "Not verified yet"}
            </p>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-[var(--gray-500)]">Account</p>
            <p className="mt-1 text-lg font-semibold text-[var(--gray-900)]">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-4">
              <Button href="/settings" variant="outline" size="sm">
                Manage account
              </Button>
            </div>
          </div>
        </div>

        <div className="card mt-8">
          <h2 className="text-xl font-semibold text-[var(--gray-900)]">Build your product here</h2>
          <p className="mt-2 text-[var(--gray-600)]">
            This page is the starting point for your own application. Everything around it,
            authentication, billing, email, storage, and deployment, is already wired up.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

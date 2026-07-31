import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth-session";
import { withNext } from "@/lib/redirects";
import { PaddleInitializer } from "@/components/payment/PaddleInitializer";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * Paddle's default payment link points here. Paddle Billing does not host the
 * checkout page itself: creating a transaction returns
 * `{your default payment link}?_ptxn={transaction id}`, so this route has to
 * exist on your own domain and open the overlay for that transaction. Set that
 * link in the Paddle dashboard, or checkout sends customers to a page that
 * does not exist.
 */
export default async function CheckoutPage(props: { searchParams: Promise<{ _ptxn?: string }> }) {
  const { _ptxn } = await props.searchParams;
  if (!_ptxn) {
    redirect("/pricing");
  }

  // The proxy only checks that a session cookie exists, so this is the check
  // that actually enforces access. The transaction id rides through login so
  // the overlay reopens afterwards.
  const user = await getSessionUser();
  if (!user) {
    redirect(withNext("/auth/login", `/checkout?_ptxn=${encodeURIComponent(_ptxn)}`));
  }

  // Read here rather than inlined via next.config.ts: the token is public by
  // design, but only one component needs it, and reading it server-side keeps
  // it out of every page's bundle and runtime-configurable.
  const token = process.env.PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.error("[checkout] PADDLE_CLIENT_TOKEN is not set, cannot open the overlay");
    redirect("/pricing");
  }

  const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
  return <PaddleInitializer token={token} environment={environment} />;
}

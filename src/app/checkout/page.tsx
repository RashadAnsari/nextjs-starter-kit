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
 * Paddle's default payment link points here.
 *
 * Paddle Billing does not host the checkout page itself: creating a transaction
 * returns `{your default payment link}?_ptxn={transaction id}`, so this route
 * has to exist on your own domain and open the overlay for that transaction.
 * Set the default payment link in the Paddle dashboard, under Checkout
 * settings, to https://yourdomain.com/checkout, or checkout will redirect
 * customers to a page that does not exist.
 *
 * The client token is read here on the server and handed down as a prop. It is
 * public by design, but it does not need to be inlined into every page's bundle
 * to reach the one component that uses it.
 */
export default async function CheckoutPage(props: { searchParams: Promise<{ _ptxn?: string }> }) {
  const { _ptxn } = await props.searchParams;
  if (!_ptxn) {
    redirect("/pricing");
  }

  // The proxy already bounced anonymous visitors, but it only checks that a
  // session cookie exists. This is the check that actually enforces access, and
  // it is required of every protected page: see AGENTS.md. Carry the Paddle
  // transaction id through login so the overlay reopens afterwards.
  const user = await getSessionUser();
  if (!user) {
    redirect(withNext("/auth/login", `/checkout?_ptxn=${encodeURIComponent(_ptxn)}`));
  }

  const token = process.env.PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.error("[checkout] PADDLE_CLIENT_TOKEN is not set, cannot open the overlay");
    redirect("/pricing");
  }

  const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
  return <PaddleInitializer token={token} environment={environment} />;
}

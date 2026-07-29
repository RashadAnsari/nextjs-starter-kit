import { redirect } from "next/navigation";
import type { Metadata } from "next";
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

  const token = process.env.PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.error("[checkout] PADDLE_CLIENT_TOKEN is not set, cannot open the overlay");
    redirect("/pricing");
  }

  const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
  return <PaddleInitializer token={token} environment={environment} />;
}

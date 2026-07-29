import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { pool } from "@/lib/db";
import { getPaymentProviderByName } from "@/lib/payment/provider";
import { PaymentCustomerRepository } from "@/lib/repositories/paymentCustomerRepository";

/** Payment history, read live from every provider the user has a customer id at. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerRows = await new PaymentCustomerRepository(pool).listByUserId(user.id);

  if (!customerRows.length) {
    return NextResponse.json({ payments: [] });
  }

  try {
    const results = await Promise.allSettled(
      customerRows.map(({ provider, customer_id }) => {
        const p = getPaymentProviderByName(provider);
        return p ? p.getPaymentHistory(customer_id) : Promise.resolve([]);
      })
    );

    // A provider customer can predate this account when the same email
    // subscribed before, so only payments made since registration are shown.
    const registeredAt = new Date(user.createdAt);
    const payments = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((p) => p.paidAt != null && p.paidAt >= registeredAt);
    payments.sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));

    return NextResponse.json({ payments });
  } catch (err) {
    console.error("[payments] Payment provider error:", err);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}

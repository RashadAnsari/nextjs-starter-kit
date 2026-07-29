import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { grantComplimentaryAccess } from "@/lib/payment/subscription";

/**
 * Grants complimentary access when no payment provider is configured, so the
 * app works end to end before billing is set up. grantComplimentaryAccess
 * no-ops once PAYMENT_PROVIDER is set, and is idempotent for a user who
 * already has a subscription row.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { granted } = await grantComplimentaryAccess(user.id);
  return NextResponse.json({ granted });
}

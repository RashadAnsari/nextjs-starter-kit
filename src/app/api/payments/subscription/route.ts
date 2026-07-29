import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/payment/subscription";
import { hasPremiumAccess } from "@/lib/payment/plans";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getUserSubscription(user.id);
  return NextResponse.json({ ...sub, hasAccess: hasPremiumAccess(sub) });
}

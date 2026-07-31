import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { withNext } from "@/lib/redirects";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // The proxy only checks that a session cookie exists, so this is the check
  // that actually enforces access. Every protected page needs it.
  const user = await getSessionUser();
  if (!user) {
    redirect(withNext("/auth/login", "/settings"));
  }

  return <SettingsClient />;
}

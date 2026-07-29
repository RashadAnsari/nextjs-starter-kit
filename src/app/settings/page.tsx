import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { withNext } from "@/lib/redirects";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // The proxy already bounced anonymous visitors, but it only checks that a
  // session cookie exists. This is the check that actually enforces access, and
  // it is required of every protected page: see AGENTS.md.
  const user = await getSessionUser();
  if (!user) {
    redirect(withNext("/auth/login", "/settings"));
  }

  return <SettingsClient />;
}

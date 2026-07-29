import { ResetPasswordClient } from "./ResetPasswordClient";

/**
 * Better Auth redirects here from the reset email as
 * /auth/reset-password?token=… (or ?error=… when the link is no longer valid).
 */
export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  return <ResetPasswordClient token={token ?? null} />;
}

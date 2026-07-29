import { SignupClient } from "./SignupClient";

/**
 * `next` is the page the user was trying to reach before being sent here. It
 * travels through the confirmation email, since the account is only usable
 * once that link is clicked.
 */
export default async function SignupPage(props: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await props.searchParams;
  return <SignupClient next={next ?? null} />;
}

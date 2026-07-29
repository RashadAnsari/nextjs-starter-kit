"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { analytics } from "@/lib/analytics";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AuthCard } from "@/components/ui/AuthCard";
import { afterAuthPath, withNext } from "@/lib/redirects";

export function SignupClient({ next }: { next: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function validate() {
    const fieldErrors: typeof errors = {};
    if (!form.name.trim()) {
      fieldErrors.name = "Please enter your name";
    }
    if (!form.email || !form.email.includes("@")) {
      fieldErrors.email = "Please enter a valid email";
    }
    if (!form.password || form.password.length < 8) {
      fieldErrors.password = "Password must be at least 8 characters";
    }
    if (!termsAccepted) {
      fieldErrors.terms = "You must accept the terms to continue";
    }
    return fieldErrors;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    setErrors({});
    const { error } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
      // Where the confirmation link lands, which is the first page the user
      // actually sees signed in, so `next` has to be carried here.
      callbackURL: afterAuthPath(next),
    });
    setLoading(false);
    if (error) {
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    analytics.signUp();
    // Email verification is required, so there is no session yet: the account
    // is activated by the link in the confirmation email.
    setEmailSent(true);
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <AuthCard backLink>
      {emailSent ? (
        <div className="text-center flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-[var(--gray-900)]">Check your email</h1>
          <p className="text-[var(--gray-600)]">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your
            account.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-1 text-[var(--gray-900)]">Create your account</h1>
          <p className="mb-8 text-[var(--gray-600)]">Get started in less than a minute</p>

          <ErrorBanner
            message={errors.form ?? null}
            onHide={() => setErrors((prev) => ({ ...prev, form: undefined }))}
          />
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <Input
              label="Full name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
              autoComplete="name"
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              hint="Must be at least 8 characters"
              error={errors.password}
              autoComplete="new-password"
            />

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (errors.terms) {
                      setErrors((prev) => ({ ...prev, terms: undefined }));
                    }
                  }}
                  className="cursor-pointer flex-shrink-0 accent-[var(--brand-900)]"
                />
                <span className="text-sm leading-normal text-[var(--gray-600)]">
                  I agree to the{" "}
                  <Link
                    href="/terms-and-conditions"
                    className="font-medium text-[var(--brand-900)]"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="font-medium text-[var(--brand-900)]">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.terms && <p className="input-error-msg">{errors.terms}</p>}
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <p className="text-center text-sm text-[var(--gray-600)]">
            Already have an account?{" "}
            <Link
              href={withNext("/auth/login", next)}
              className="font-semibold text-[var(--brand-900)]"
            >
              Log in
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

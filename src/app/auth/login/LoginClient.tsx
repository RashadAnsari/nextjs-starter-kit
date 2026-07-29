"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { analytics } from "@/lib/analytics";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AuthCard } from "@/components/ui/AuthCard";
import { afterAuthPath, withNext } from "@/lib/redirects";

export function LoginClient({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const fieldErrors: typeof errors = {};
    if (!email || !email.includes("@")) {
      fieldErrors.email = "Please enter a valid email";
    }
    if (!password) {
      fieldErrors.password = "Password is required";
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
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    analytics.logIn();
    router.push(afterAuthPath(next));
  }

  return (
    <AuthCard backLink>
      <h1 className="text-3xl font-bold mb-1 text-[var(--gray-900)]">Welcome back</h1>
      <p className="mb-8 text-[var(--gray-600)]">Log in to your account</p>

      <ErrorBanner
        message={errors.form ?? null}
        onHide={() => setErrors((prev) => ({ ...prev, form: undefined }))}
      />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          error={errors.email}
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) {
              setErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          error={errors.password}
          autoComplete="current-password"
        />

        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="text-right mt-3">
        <Link href="/auth/forgot-password" className="text-sm font-medium text-[var(--brand-900)]">
          Forgot password?
        </Link>
      </div>

      <div className="divider">
        <span>or</span>
      </div>

      <p className="text-center text-sm text-[var(--gray-600)]">
        {"Don't have an account? "}
        <Link
          href={withNext("/auth/signup", next)}
          className="font-semibold text-[var(--brand-900)]"
        >
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}

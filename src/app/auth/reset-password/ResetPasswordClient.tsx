"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AuthCard } from "@/components/ui/AuthCard";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const INVALID_LINK = "Invalid or expired reset link. Please request a new one.";

export function ResetPasswordClient({ token }: { token: string | null }) {
  const router = useRouter();
  const [passwords, setPasswords] = useState({ next: "", confirm: "" });
  const [errors, setErrors] = useState<{ next?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (!passwords.next || passwords.next.length < 8) {
      fieldErrors.next = "Must be at least 8 characters";
    }
    if (passwords.next !== passwords.confirm) {
      fieldErrors.confirm = "Passwords do not match";
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    if (!token) {
      setErrors({ form: INVALID_LINK });
      return;
    }
    setLoading(true);
    setErrors({});
    const { error } = await authClient.resetPassword({ newPassword: passwords.next, token });
    setLoading(false);
    if (error) {
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    router.push("/auth/login");
  }

  return (
    <AuthCard>
      <h1 className="text-3xl font-bold mb-1 text-[var(--gray-900)]">Set new password</h1>
      <p className="mb-8 text-[var(--gray-600)]">Choose a strong password for your account.</p>

      <ErrorBanner
        message={errors.form ?? null}
        onHide={() => setErrors((p) => ({ ...p, form: undefined }))}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Input
          label="New password"
          type="password"
          placeholder="At least 8 characters"
          value={passwords.next}
          onChange={(e) => {
            setPasswords((p) => ({ ...p, next: e.target.value }));
            if (errors.next) {
              setErrors((p) => ({ ...p, next: undefined }));
            }
          }}
          error={errors.next}
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="Repeat your password"
          value={passwords.confirm}
          onChange={(e) => {
            setPasswords((p) => ({ ...p, confirm: e.target.value }));
            if (errors.confirm) {
              setErrors((p) => ({ ...p, confirm: undefined }));
            }
          }}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

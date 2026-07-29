"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const errorClasses = error
    ? "border-[var(--red)] focus:ring-[var(--red-light)]"
    : "border-[var(--gray-300)] focus:ring-[var(--brand-50)]";

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--gray-700)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-2xl border px-4 py-3 text-base text-[var(--gray-900)] bg-white placeholder:text-[var(--gray-400)] transition-all focus:outline-none focus:border-[var(--brand-900)] focus:ring-2 ${errorClasses} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[var(--gray-500)] mt-1">{hint}</p>}
      {error && <p className="text-sm text-[var(--red)] mt-1">{error}</p>}
    </div>
  );
});

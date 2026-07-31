import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "white";
type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface ButtonProps extends BaseProps {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** For callers that have to take focus on mount, such as a dialog on open. */
  autoFocus?: boolean;
}

interface LinkButtonProps extends BaseProps {
  href: string;
  type?: undefined;
  disabled?: undefined;
  onClick?: undefined;
}

type Props = ButtonProps | LinkButtonProps;

function getClassNames(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  className?: string
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed";

  const variantMap: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--brand-900)] text-white border border-transparent hover:bg-[var(--brand-700)]",
    secondary:
      "bg-white text-[var(--brand-900)] border border-[var(--brand-900)] hover:bg-[var(--brand-50)]",
    outline:
      "bg-white text-[var(--gray-700)] border border-[var(--gray-300)] hover:bg-[var(--gray-50)]",
    ghost:
      "bg-transparent text-[var(--gray-600)] border border-transparent hover:bg-[var(--gray-100)]",
    danger: "bg-[var(--red)] text-white border border-[var(--red)] hover:bg-[#b91c1c]",
    white: "bg-white text-[var(--brand-900)] border border-white hover:bg-[var(--gray-100)]",
  };

  const sizeMap: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-3 text-lg",
  };

  return [base, variantMap[variant], sizeMap[size], fullWidth ? "w-full" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: Props) {
  const { variant = "primary", size = "md", fullWidth = false, className, children } = props;
  const classes = getClassNames(variant, size, fullWidth, className);

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      autoFocus={props.autoFocus}
      disabled={props.disabled}
      onClick={props.onClick}
      className={classes}
    >
      {children}
    </button>
  );
}

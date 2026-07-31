export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-[var(--gray-200)] bg-white p-8">
      <div className="mb-8">
        <h2 className="mb-1 text-xl font-semibold text-[var(--gray-900)]">{title}</h2>
        <p className="text-sm text-[var(--gray-600)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** A labelled row inside a SettingsSection, with its control on the right. */
export function SettingsItem({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-6 border-b border-[var(--gray-100)] py-6 first:pt-0 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="mb-0.5 text-[0.9375rem] font-semibold text-[var(--gray-900)]">{label}</div>
        <p className="text-sm leading-relaxed text-[var(--gray-600)]">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

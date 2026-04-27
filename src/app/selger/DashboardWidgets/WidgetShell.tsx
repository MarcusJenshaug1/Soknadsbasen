import Link from "next/link";

export function WidgetShell({
  title,
  children,
  href,
  cta,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <section
      className={
        "rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5 " + className
      }
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-tight">{title}</h2>
        {href && cta && (
          <Link
            href={href}
            prefetch={true}
            className="text-[11px] text-ink/55 hover:text-ink transition-colors"
          >
            {cta} →
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="h-[220px] rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse" />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center py-6">
      <p className="text-[13px] font-medium">{title}</p>
      {hint && <p className="text-[12px] text-ink/55 mt-1">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          prefetch={true}
          className="inline-block mt-3 px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 transition-opacity"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

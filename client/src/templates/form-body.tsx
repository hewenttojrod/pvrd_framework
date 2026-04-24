import type { PropsWithChildren } from "react";

type FormBodyProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  className?: string;
}>;

export default function FormBody({ title, subtitle, className, children }: FormBodyProps) {
  const classes = [
    "h-[calc(100vh)] w-full overflow-auto border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {(title || subtitle) && (
        <header className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700">
          {title && <h1 className="text-2xl font-semibold">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>}
        </header>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

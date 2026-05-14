/**
 * Bordered card container for grouping related form content or information.
 * Renders an optional section heading when `title` is provided.
 * Accepts additional CSS classes via `className` for spacing or width overrides.
 */
import type { PropsWithChildren } from "react";

type SectionPanelProps = PropsWithChildren<{
  title?: string;
  className?: string;
}>;

export default function SectionPanel({ title, className, children }: SectionPanelProps) {
  const classes = ["rounded border border-slate-200 p-4 dark:border-slate-700", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
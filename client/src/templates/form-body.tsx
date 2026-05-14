/**
 * Layout wrapper component for form and content pages.
 * Renders a consistent page container with an optional header section
 * (title and subtitle) above the provided child content.
 */
import type { PropsWithChildren } from "react";

/**
 * Layout wrapper component for form and content pages.
 * Provides a consistent container with optional header (title/subtitle).
 * 
 * @param title - Optional main heading
 * @param subtitle - Optional description text below title
 * @param className - Optional additional CSS classes
 * @param children - Page content to render
 */

type FormBodyProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  className?: string;
  bodyClassName?: string;
}>;

export default function FormBody({ title, subtitle, className, bodyClassName, children }: FormBodyProps) {
  const classes = ["page-shell", className].filter(Boolean).join(" ");
  const bodyClasses = ["page-shell__body", bodyClassName].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {(title || subtitle) && (
        <header className="page-shell__header">
          {title && <h1 className="page-shell__title">{title}</h1>}
          {subtitle && <p className="page-shell__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className={bodyClasses}>{children}</div>
    </section>
  );
}

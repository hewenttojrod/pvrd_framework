import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type FormFieldLabelProps = {
  label: string;
  hintInfo?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
};

function FieldHint({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <>
      <span className="relative ml-1.5 inline-flex items-center">
        <span
          ref={ref}
          onMouseEnter={show}
          onMouseLeave={() => setPos(null)}
          className="flex h-4 w-4 cursor-default items-center justify-center rounded-full bg-slate-300 text-xs font-bold leading-none text-slate-700 dark:bg-slate-600 dark:text-slate-200"
          aria-label="Field help"
        >
          ?
        </span>
      </span>
      {pos && typeof document !== "undefined" && createPortal(
        <span
          style={{ position: "fixed", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)", zIndex: 3000 }}
          className="pointer-events-none w-56 whitespace-pre-line rounded bg-slate-800 px-2 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700"
        >
          {text}
        </span>,
        document.body
      )}
    </>
  );
}

export function FormFieldLabel({ label, hintInfo, required, htmlFor, className }: FormFieldLabelProps) {
  const classes = className ?? "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
  const content = (
    <>
      <span>{label}</span>
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">*</span>
      )}
      {hintInfo && <FieldHint text={hintInfo} />}
    </>
  );

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={classes}>
        {content}
      </label>
    );
  }

  return <span className={classes}>{content}</span>;
}

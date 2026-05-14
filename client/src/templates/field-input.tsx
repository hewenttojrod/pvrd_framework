/**
 * Primitive input renderer that maps a `FieldDef.type` to the appropriate HTML element.
 *
 * Supported types:
 * - `"boolean"`  → `<input type="checkbox">`; value is `checked` (boolean)
 * - `"textarea"` → `<textarea>`
 * - `"select"`   → `<select>` with a blank default option followed by `field.options`
 * - `"number"`   → `<input type="number">`
 * - `"date"`     → `<input type="date">`
 * - `"datetime"` → `<input type="datetime-local">`
 * - `"text"` (fallback) → `<input type="text">`
 *
 * All inputs fire `onChange(field.key, value)` where `value` is the native DOM value
 * (a string for most types, a boolean for checkboxes). Type coercion is handled upstream
 * by `FormBuilder.parseFieldValue` or the caller.
 *
 * Inputs respect `field.readOnly` (rendered but non-interactive) in addition to `disabled`.
 */
import type { FieldDef } from "@app-types/api";

type FieldInputProps<TRow extends Record<string, unknown>> = {
  field: FieldDef<TRow>;
  value: unknown;
  disabled: boolean;
  onChange: (key: string, val: unknown) => void;
};

export default function FieldInput<TRow extends Record<string, unknown>>({
  field,
  value,
  disabled,
  onChange,
}: FieldInputProps<TRow>) {
  const baseClass = "form-input";

  if (field.type === "boolean") {
    return (
      <input
        id={field.key}
        type="checkbox"
        disabled={disabled || field.readOnly}
        checked={Boolean(value)}
        onChange={(e) => onChange(field.key, e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        disabled={disabled || field.readOnly}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.key, e.target.value)}
        rows={4}
        className={baseClass}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={field.key}
        disabled={disabled || field.readOnly}
        value={String(value ?? "")}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={baseClass}
      >
        <option value="">— Select —</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "datetime"
          ? "datetime-local"
          : "text";

  return (
    <input
      id={field.key}
      type={inputType}
      disabled={disabled || field.readOnly}
      value={String(value ?? "")}
      placeholder={field.placeholder}
      onChange={(e) => onChange(field.key, e.target.value)}
      className={baseClass}
    />
  );
}

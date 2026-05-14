/**
 * Core form state management hook for schema-driven forms.
 *
 * `useFormEngine` is the single source of truth for:
 *  - field values (initialised from `schema.fields[*].defaultValue`)
 *  - validation errors
 *  - dirty state (any field has been changed since last reset/replaceValues)
 *  - payload construction (via `schema.payloadTransform`)
 *
 * Typical flow:
 *  1. Call `useFormEngine(schema)` at the top of your component.
 *  2. Pass `values`, `errors`, `setFieldValue` to `FormBuilder` for rendering.
 *  3. Gate submit actions with `validate()` — it sets errors and returns `true` only when clean.
 *  4. Call `buildPayload()` to produce the typed API payload.
 *  5. Call `reset()` or `replaceValues()` when the form should be re-seeded (e.g. after fetch).
 */

import { useMemo, useState } from "react";

import type {
  FormErrors,
  FormSchema,
  FormValues,
  ValidationContext,
} from "../schemas/form-schema.types";

type UseFormEngineOptions<TValues extends FormValues> = {
  initialValues?: Partial<TValues>;
};

type UseFormEngineReturn<TValues extends FormValues, TPayload> = {
  values: TValues;
  errors: FormErrors<TValues>;
  isDirty: boolean;
  setFieldValue: <K extends keyof TValues & string>(key: K, value: TValues[K]) => void;
  replaceValues: (nextValues: Partial<TValues>, options?: { markDirty?: boolean }) => void;
  clearErrors: () => void;
  reset: () => void;
  validate: () => boolean;
  buildPayload: () => TPayload;
};

/** Builds a flat `TValues` object by reading `defaultValue` from each field in the schema. */
function buildDefaults<TValues extends FormValues>(schema: FormSchema<TValues, unknown>): TValues {
  const defaults = {} as TValues;
  for (const field of schema.fields) {
    defaults[field.key] = field.defaultValue as TValues[keyof TValues & string];
  }
  return defaults;
}

/**
 * Returns `true` when a value should be considered non-empty for the purposes of
 * the built-in `required` check. Strings must be non-blank; everything else must be
 * non-null and non-undefined.
 */
function ruleRequired(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Schema-driven form engine hook.
 *
 * @template TValues  - Shape of the internal form values (inferred from schema).
 * @template TPayload - Shape of the data returned by `buildPayload()`. Defaults to `TValues`
 *                      when no `payloadTransform` is provided.
 *
 * @param schema  - Form schema describing fields, sections, validation, and payload transform.
 * @param options - Optional initial values to merge over the schema defaults at mount time.
 *
 * @returns
 *  - `values`        — Current values bag. Pass to `FormBuilder` and read before submitting.
 *  - `errors`        — Per-field error strings. Populated after `validate()` fails.
 *  - `isDirty`       — `true` once any field has been changed (cleared by `reset`/`replaceValues`).
 *  - `setFieldValue` — Update a single field; marks the form dirty.
 *  - `replaceValues` — Bulk-replace values (e.g. after loading a record). Clears errors.
 *                      Pass `{ markDirty: true }` when the replacement should count as a user edit.
 *  - `clearErrors`   — Dismiss all validation errors without changing values.
 *  - `reset`         — Restore defaults and clear errors + dirty flag.
 *  - `validate`      — Run required + custom validation rules. Sets errors and returns `true` only
 *                      when every field passes. Call this before any submit action.
 *  - `buildPayload`  — Apply `schema.payloadTransform` (if defined) and return the typed payload.
 */
export function useFormEngine<TValues extends FormValues, TPayload = TValues>(
  schema: FormSchema<TValues, TPayload>,
  options?: UseFormEngineOptions<TValues>
): UseFormEngineReturn<TValues, TPayload> {
  const defaults = useMemo(() => {
    return {
      ...buildDefaults(schema),
      ...(options?.initialValues ?? {}),
    } as TValues;
  }, [schema, options?.initialValues]);

  const [values, setValues] = useState<TValues>(defaults);
  const [errors, setErrors] = useState<FormErrors<TValues>>({});
  const [isDirty, setIsDirty] = useState(false);

  const setFieldValue = <K extends keyof TValues & string>(key: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const replaceValues = (nextValues: Partial<TValues>, settings?: { markDirty?: boolean }) => {
    setValues((prev) => ({ ...prev, ...nextValues }));
    setErrors({});
    setIsDirty(Boolean(settings?.markDirty));
  };

  const clearErrors = () => {
    setErrors({});
  };

  const reset = () => {
    setValues(defaults);
    setErrors({});
    setIsDirty(false);
  };

  const validate = () => {
    const nextErrors: FormErrors<TValues> = {};

    for (const field of schema.fields) {
      const value = values[field.key];

      if (field.required && !ruleRequired(value)) {
        nextErrors[field.key] = `${field.label} is required.`;
        continue;
      }

      if (!field.validations || field.validations.length === 0) {
        continue;
      }

      const context: ValidationContext<TValues> = {
        values,
        fieldKey: field.key,
      };

      const failedRule = field.validations.find((rule) => !rule.validate(value, context));
      if (failedRule) {
        nextErrors[field.key] = failedRule.message;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => {
    if (schema.payloadTransform) {
      return schema.payloadTransform(values);
    }
    return values as unknown as TPayload;
  };

  return {
    values,
    errors,
    isDirty,
    setFieldValue,
    replaceValues,
    clearErrors,
    reset,
    validate,
    buildPayload,
  };
}

/**
 * Derives which form fields should be rendered and which inputs should be disabled,
 * based on the `visible` and `disabled` predicates defined in each `FieldSchema`.
 *
 * Results are memoized — recomputed only when `fields` or `values` change — so this
 * hook is safe to call on every render inside `FormBuilder` without performance cost.
 */
import { useMemo } from "react";

import type { FieldSchema, FormValues } from "../schemas/form-schema.types";

/**
 * Evaluates `visible` and `disabled` predicates for each field against the current form values.
 *
 * @param fields - Full list of field schemas from the form schema.
 * @param values - Current form values bag; changes here trigger re-evaluation.
 *
 * @returns
 *  - `visibleFields`  — Filtered array of fields whose `visible` predicate returns true
 *                       (or fields with no predicate, which are always shown).
 *  - `disabledKeys`   — Set of field keys whose `disabled` predicate returns true
 *                       against the current values. Used by `FormBuilder` to disable inputs.
 */
export function useFieldVisibility<TValues extends FormValues>(
  fields: Array<FieldSchema<TValues>>,
  values: TValues
) {
  return useMemo(() => {
    const visibleFields = fields.filter((field) => {
      if (!field.visible) {
        return true;
      }
      return field.visible(values);
    });

    const disabledKeys = new Set<string>(
      visibleFields
        .filter((field) => field.disabled?.(values))
        .map((field) => field.key)
    );

    return {
      visibleFields,
      disabledKeys,
    };
  }, [fields, values]);
}

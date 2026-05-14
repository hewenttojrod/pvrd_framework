/**
 * Core type contracts for the schema-driven form engine.
 *
 * Usage overview:
 *  1. Define a `FormSchema<TValues, TPayload>` that describes every field.
 *  2. Pass it to `useFormEngine` to get managed state, validation, and payload building.
 *  3. Pass schema + engine state to `FormBuilder` to render the form automatically.
 */

import type { FieldType, SelectOption } from "@app-types/api";

/** Base constraint for all form value bags — an object with string keys and unknown values. */
export type FormValues = Record<string, unknown>;

/**
 * Context object passed to each field's custom `validate` function,
 * giving access to sibling field values for cross-field validation.
 */
export type ValidationContext<TValues extends FormValues> = {
  /** The complete set of current form values at the time of validation. */
  values: TValues;
  /** The key of the field currently being validated. */
  fieldKey: keyof TValues & string;
};

/**
 * A single validation rule for a form field.
 * If `validate` returns false, `message` is shown as the field error.
 */
export type ValidationRule<TValues extends FormValues> = {
  /** Error message displayed when the rule fails. */
  message: string;
  /**
   * Returns true when the value is valid.
   * Receives the raw field value and a context object containing all current values.
   */
  validate: (value: unknown, context: ValidationContext<TValues>) => boolean;
};

/**
 * Describes a single field within a `FormSchema`.
 * Used by `FormBuilder` to render the input and by `useFormEngine` to manage state and validation.
 *
 * @template TValues - Shape of the overall form values object
 */
export type FieldSchema<TValues extends FormValues> = {
  /** Matches a key in `TValues`; used as the HTML input `id` and state lookup key. */
  key: keyof TValues & string;
  /** Human-readable label rendered above (or beside) the input. */
  label: string;
  /** Determines which HTML input element is rendered. */
  type: FieldType;
  /** Links this field to a `FormSection` by matching the section's `id`. */
  section?: string;
  /** If true, the field spans both grid columns (useful for textareas and wide inputs). */
  wide?: boolean;
  /** If true, `useFormEngine.validate()` will reject an empty value for this field. */
  required?: boolean;
  /** If true, the input is shown but cannot be changed by the user. */
  readOnly?: boolean;
  /** Placeholder text for text/number/textarea inputs. */
  placeholder?: string;
  /** Text shown in a portal tooltip when the user hovers the "?" icon beside the label. */
  hint_info?: string;
  /** Options for `select` fields. */
  options?: SelectOption[];
  /** Reserved for future use: key into an async options registry. */
  asyncOptionsKey?: string;
  /** Value used when `useFormEngine` initialises or resets the field. */
  defaultValue?: unknown;
  /**
   * Optional transform applied by `FormBuilder` before calling `onChange`.
   * Useful for coercing raw DOM strings to typed values (e.g. ISO → Date object).
   * Receives the raw input value and the full current values bag.
   */
  parseValue?: (rawValue: unknown, values: TValues) => unknown;
  /**
   * Predicate that controls whether this field is rendered.
   * Re-evaluated on every render via `useFieldVisibility`.
   * When absent the field is always visible.
   */
  visible?: (values: TValues) => boolean;
  /**
   * Predicate that controls whether this field's input is disabled.
   * Re-evaluated on every render via `useFieldVisibility`.
   * When absent the field is always enabled (unless the parent sets `disabled`).
   */
  disabled?: (values: TValues) => boolean;
  /** Additional validation rules run by `useFormEngine.validate()` after the required check. */
  validations?: ValidationRule<TValues>[];
};

/**
 * Groups related fields under a labelled section heading in `FormBuilder`.
 * Field order within the section follows the `fields` array.
 */
export type FormSection<TValues extends FormValues> = {
  /** Unique identifier; matched against `FieldSchema.section`. */
  id: string;
  /** Heading text rendered above the section's fields. */
  label: string;
  /** Optional sub-heading rendered below the section label. */
  description?: string;
  /** Ordered list of field keys belonging to this section. */
  fields: Array<keyof TValues & string>;
};

/**
 * Top-level schema describing a complete form.
 *
 * Pass this to `useFormEngine` to drive state and to `FormBuilder` to drive rendering.
 *
 * @template TValues  - Shape of the internal form values object.
 * @template TPayload - Shape of the data sent to the API (may differ from TValues).
 *                      Defaults to TValues when no transformation is needed.
 */
export type FormSchema<TValues extends FormValues, TPayload = TValues> = {
  /** Display name for this schema (used for debugging / DevTools). */
  name: string;
  /** All field definitions for this form. Order determines layout within sections. */
  fields: Array<FieldSchema<TValues>>;
  /**
   * Optional grouping of fields into labelled sections.
   * Fields not listed in any section are rendered in an unsectioned grid at the bottom.
   */
  sections?: Array<FormSection<TValues>>;
  /**
   * Optional transform that converts the internal `TValues` bag into the API payload shape.
   * Called by `useFormEngine.buildPayload()`. When absent, `values` is cast directly to `TPayload`.
   */
  payloadTransform?: (values: TValues) => TPayload;
  /**
   * Optional transform for mapping an API response back to form values.
   * Useful for hydrating an edit form from a fetched record.
   */
  responseTransform?: (payload: unknown) => Partial<TValues>;
};

/** Maps each field key in `TValues` to an optional validation error string. */
export type FormErrors<TValues extends FormValues> = Partial<Record<keyof TValues & string, string>>;

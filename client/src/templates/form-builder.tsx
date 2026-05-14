/**
 * Generic schema-to-UI form renderer.
 *
 * `FormBuilder` reads a `FormSchema` and renders each visible field using `FieldInput` and
 * `FormFieldLabel`. It replaces hand-written form JSX — add a field to the schema and it
 * appears automatically without touching any component markup.
 *
 * Rendering rules:
 * - Fields are grouped into labelled sections if `schema.sections` is defined.
 * - Fields with no `section`, or a schema with no sections, render in a flat grid.
 * - `boolean` fields render as a labelled checkbox (label beside input).
 * - All other fields render with the label above the input.
 * - Fields hidden by `FieldSchema.visible` are omitted from the DOM entirely.
 * - Fields disabled by `FieldSchema.disabled` (or the global `disabled` prop) receive
 *   the HTML `disabled` attribute.
 * - Validation errors are displayed as a small red message below the input.
 *
 * This component is stateless — all state lives in `useFormEngine`.
 */

import FieldInput from "@templates/field-input";
import { FormFieldLabel } from "@templates/form-field-label";

import { useFieldVisibility } from "@/hooks/use-field-visibility";
import type { FieldSchema, FormErrors, FormSchema, FormValues } from "@/schemas/form-schema.types";
import type { FieldDef } from "@app-types/api";

type FormBuilderProps<TValues extends FormValues> = {
  schema: FormSchema<TValues, unknown>;
  values: TValues;
  errors?: FormErrors<TValues>;
  disabled?: boolean;
  onChange: <K extends keyof TValues & string>(key: K, value: TValues[K]) => void;
};

/**
 * Converts a `FieldSchema` (form-engine contract) into a `FieldDef` (FieldInput contract).
 * Only the properties that `FieldInput` understands are forwarded; schema-only properties
 * such as `visible`, `disabled`, and `validations` are intentionally dropped here.
 */
function mapFieldToDef<TValues extends FormValues>(field: FieldSchema<TValues>): FieldDef<TValues> {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    readOnly: field.readOnly,
    required: field.required,
    options: field.options,
    placeholder: field.placeholder,
    hint_info: field.hint_info,
  };
}

/**
 * Coerces a raw DOM event value (always a string from `FieldInput`) into the typed value
 * expected by the field's position in `TValues`.
 *
 * Priority:
 *  1. If the field defines a `parseValue` function, delegate to it.
 *  2. If the field type is "number", convert to a JS number (or keep as "" for blank inputs).
 *  3. Otherwise return the raw string unchanged.
 */
function parseFieldValue<TValues extends FormValues>(
  field: FieldSchema<TValues>,
  rawValue: unknown,
  values: TValues
): unknown {
  if (field.parseValue) {
    return field.parseValue(rawValue, values);
  }

  if (field.type === "number") {
    if (rawValue === "") {
      return "";
    }
    const numberValue = Number(rawValue);
    return Number.isNaN(numberValue) ? rawValue : numberValue;
  }

  return rawValue;
}

export default function FormBuilder<TValues extends FormValues>({
  schema,
  values,
  errors,
  disabled,
  onChange,
}: FormBuilderProps<TValues>) {
  const { visibleFields, disabledKeys } = useFieldVisibility(schema.fields, values);

  const fieldsBySection = schema.sections?.map((section) => {
    const sectionFields = visibleFields.filter(
      (field) => field.section === section.id && section.fields.includes(field.key)
    );

    return {
      ...section,
      fields: sectionFields,
    };
  });

  const unsectionedFields = visibleFields.filter((field) => {
    if (!schema.sections || schema.sections.length === 0) {
      return true;
    }

    return !field.section;
  });

  const renderField = (field: FieldSchema<TValues>) => {
    const fieldDef = mapFieldToDef(field);
    const fieldKey = field.key;
    const isBoolean = field.type === "boolean";
    const fieldDisabled = Boolean(disabled) || disabledKeys.has(fieldKey);
    const message = errors?.[fieldKey];
    const wrapperClass = field.wide ? "sm:col-span-2" : "";

    if (isBoolean) {
      return (
        <label key={field.key} className={`checkbox-field ${wrapperClass}`.trim()}>
          <FieldInput
            field={fieldDef}
            value={values[fieldKey]}
            disabled={fieldDisabled}
            onChange={(key, rawValue) => {
              const parsed = parseFieldValue(field, rawValue, values) as TValues[typeof fieldKey];
              onChange(key as keyof TValues & string, parsed);
            }}
          />
          <FormFieldLabel
            className="inline-flex items-center"
            label={field.label}
            hintInfo={field.hint_info}
            required={field.required}
          />
        </label>
      );
    }

    return (
      <div key={field.key} className={wrapperClass}>
        <FormFieldLabel
          htmlFor={field.key}
          label={field.label}
          hintInfo={field.hint_info}
          required={field.required}
        />
        <FieldInput
          field={fieldDef}
          value={values[fieldKey]}
          disabled={fieldDisabled}
          onChange={(key, rawValue) => {
            const parsed = parseFieldValue(field, rawValue, values) as TValues[typeof fieldKey];
            onChange(key as keyof TValues & string, parsed);
          }}
        />
        {message && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>}
      </div>
    );
  };

  if (!schema.sections || schema.sections.length === 0) {
    return <div className="form-grid">{visibleFields.map((field) => renderField(field))}</div>;
  }

  return (
    <div className="space-y-4">
      {fieldsBySection?.map((section) => (
        <div key={section.id} className="space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.label}</h4>
            {section.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
            )}
          </div>
          <div className="form-grid">{section.fields.map((field) => renderField(field))}</div>
        </div>
      ))}

      {unsectionedFields.length > 0 && <div className="form-grid">{unsectionedFields.map((field) => renderField(field))}</div>}
    </div>
  );
}

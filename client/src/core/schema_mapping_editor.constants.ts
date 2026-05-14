/**
 * Constants for the schema mapping editor.
 * Includes API endpoint paths, supported base data types, role badge labels,
 * user-facing help text, and field hint strings.
 */
import type { InferredRole } from "./schema_mapping_editor.types";

export const DETAIL_ENDPOINT = "/api/core/schema/source-mappings/detail/";
export const SAMPLE_ROWS_ENDPOINT = "/api/core/schema/source-mappings/sample-rows/";
export const TEST_RUN_ENDPOINT = "/api/core/schema/source-mappings/test-run/";
export const RUN_MAPPING_ENDPOINT = "/api/core/schema/source-mappings/run/";
export const COLUMN_MAPPINGS_ENDPOINT = "/api/core/schema/column-mappings/";
export const UNIT_TYPES_ENDPOINT = "/api/core/schema/unit-types/";

export const BASE_DATA_TYPE_OPTIONS = ["float", "int", "bool", "string", "datetime"];

export const ROLE_BADGE: Record<InferredRole, string> = {
  timestamp: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  value: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  dimension: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  unmapped: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  skipped: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export const ROLE_HELP_TEXT = [
  "Role types:",
  "timestamp = this column defines observation time",
  "value = primary measured value",
  "dimension = categorical attribute for grouping/filtering",
  "skipped = configured but excluded from ingestion",
  "unmapped = not mapped yet",
].join("\n");

export const FIELD_HINT = {
  columnLabel: "Optional category label, such as zone, fuel_type, market, or node.",
  semanticKey: "Canonical snake_case field key used by downstream logic.",
  unitType: "Assign a unit type to mark this as value or timestamp based on base data type.",
  notes: "Free-form implementation notes for this mapping.",
  unitName: "Human-friendly name of the unit type (for example MW or datetime).",
  baseDataType: "Underlying data type used for role inference and validation.",
  description: "Optional description of how/when this unit type should be used.",
} as const;
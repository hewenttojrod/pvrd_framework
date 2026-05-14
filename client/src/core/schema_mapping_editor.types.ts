/**
 * TypeScript types for the schema mapping editor feature.
 * Covers inferred column roles, field and unit-type row shapes, form state,
 * and the result payloads returned by test-run and full mapping API calls.
 */
export type InferredRole = "timestamp" | "value" | "dimension" | "unmapped" | "skipped";

export type FieldRow = {
  raw_column: string;
  column_mapping_id: number | null;
  is_mapped: boolean;
  semantic_key: string;
  unit_type_id: number | null;
  unit_type_name: string | null;
  column_label: string;
  notes: string;
  include_in_ingestion: boolean;
  inferred_role: InferredRole;
  suggested_semantic_key: string;
};

export type UnitTypeRow = {
  unit_type_id: number;
  unit_name: string;
  base_data_type: string;
  description: string;
};

export type SampleRow = {
  source_file_name: string;
  row_number: number;
  row_payload_json: Record<string, unknown>;
};

export type MappingForm = {
  column_label: string;
  semantic_key: string;
  unit_type_id: number | null;
  notes: string;
  include_in_ingestion: boolean;
};

export type UnitTypeForm = {
  unit_name: string;
  base_data_type: string;
  description: string;
};

export type TestRunResult = {
  success: boolean;
  message: string;
  files_tested: number;
  raw_records_processed: number;
  timeseries_points_would_create: number;
  validation_warnings: string[];
  error_detail: string | null;
};

export type RunMappingResult = {
  success: boolean;
  message: string;
  files_ran: number;
  attempted_points: number;
  inserted_points: number;
  duplicate_points_skipped: number;
  output: string;
  error_detail: string | null;
};
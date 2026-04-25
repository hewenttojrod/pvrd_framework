// Shared types for API-bound components

export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "textarea";

export type SelectOption = {
  label: string;
  value: string | number;
};

export type ColumnDef<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  /** Matches the key in the API row object */
  key: keyof TRow & string;
  /** Display label for the column header */
  label: string;
  /** Visual width hint. Defaults to auto. */
  width?: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell value */
  render?: (value: TRow[keyof TRow], row: TRow) => React.ReactNode;
};

export type GridActionContext<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  row: TRow | null;
  rowIndex: number | null;
  hasRow: boolean;
};

export type GridContextAction<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  label: string;
  onClick: (context: GridActionContext<TRow>) => void;
  isVisible?: (context: GridActionContext<TRow>) => boolean;
  isDisabled?: (context: GridActionContext<TRow>) => boolean;
};

export type FieldDef<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  /** Matches the key in the API object */
  key: keyof TRow & string;
  /** Display label */
  label: string;
  /** Input type for this field */
  type: FieldType;
  /** If true, field is shown but cannot be edited */
  readOnly?: boolean;
  /** If true, field is required before submit */
  required?: boolean;
  /** Options for select fields */
  options?: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
};

export type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export type ApiListResponse<T> = {
  results: T[];
  count: number;
};

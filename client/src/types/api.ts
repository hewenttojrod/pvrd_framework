/**
 * Shared types for API-bound components including data grids, forms, and API state management.
 * These types define the contract between frontend components and backend REST APIs.
 */

/**
 * Supported input field types for forms.
 * - "text": Single-line text input
 * - "number": Numeric input
 * - "boolean": Checkbox input
 * - "date": Date picker
 * - "datetime": Date and time picker
 * - "select": Dropdown select from options
 * - "textarea": Multi-line text input
 */
export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "textarea";

/**
 * Option item for select/dropdown fields.
 * @property label - Display text shown to user
 * @property value - Internal value submitted with form
 */
export type SelectOption = {
  label: string;
  value: string | number;
};

/**
 * Defines a column in a DataGrid component.
 * @template TRow - Row data type from API
 * @property key - Property name in row object to display in this column
 * @property label - Header text shown to user
 * @property width - Optional CSS width hint (e.g., "90px", "20%")
 * @property sortable - If true, clicking header toggles ascending/descending sort (uses DRF ordering parameter)
 * @property render - Optional custom render function; receives cell value and entire row for context
 */
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

/**
 * Context passed to grid context menu action handlers, providing information about the right-clicked row.
 * @template TRow - Row data type
 * @property row - The clicked row data, or null if clicked on empty area
 * @property rowIndex - Zero-based row index in the grid, or null for empty area
 * @property hasRow - Convenience boolean; true if row and rowIndex are non-null
 */
export type GridActionContext<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  row: TRow | null;
  rowIndex: number | null;
  hasRow: boolean;
};

/**
 * A right-click context menu action available in a DataGrid.
 * @template TRow - Row data type
 * @property id - Unique identifier for this action
 * @property label - Text displayed in the context menu
 * @property onClick - Handler called when user clicks this action
 * @property isVisible - Optional predicate; if returns false, action won't appear in menu for this context
 * @property isDisabled - Optional predicate; if returns true, action appears grayed out and non-clickable
 */
export type GridContextAction<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  label: string;
  onClick: (context: GridActionContext<TRow>) => void;
  isVisible?: (context: GridActionContext<TRow>) => boolean;
  isDisabled?: (context: GridActionContext<TRow>) => boolean;
};

/**
 * Defines a form field in an EntryForm component.
 * @template TRow - Row/record data type from API
 * @property key - Property name in form values object
 * @property label - Label text displayed above the input
 * @property type - Input type determining which HTML element is rendered
 * @property readOnly - If true, field displays value but cannot be edited
 * @property required - If true, field is marked as required and validated before submit
 * @property options - Array of label/value pairs for select fields
 * @property placeholder - Placeholder text shown when field is empty
 */
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

/**
 * Discriminated union representing the state of an async API operation.
 * - "idle": Not yet started
 * - "loading": Request in flight
 * - "success": Request completed with data
 * - "error": Request failed with error message
 * @template T - Type of successful data payload
 */
export type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

/**
 * Response envelope for paginated API list endpoints (Django REST Framework format).
 * @template T - Type of each item in results
 * @property results - Array of data items
 * @property count - Total count of items across all pages
 */
export type ApiListResponse<T> = {
  results: T[];
  count: number;
};

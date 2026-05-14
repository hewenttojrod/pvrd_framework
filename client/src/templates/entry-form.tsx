/**
 * CRUD form component for creating, editing, viewing, and deleting records via REST API.
 * Features:
 * - Four modes: create (POST), edit (PATCH), view (read-only), delete (DELETE)
 * - Multiple field types: text, number, boolean, date, datetime, select, textarea
 * - Required field validation and error display
 * - Per-operation error banners
 * - Delete confirmation workflow
 * - Automatic request cleanup on unmount
 * 
 * @template TRow - Record data type from/to API
 * @param fields - Field definitions controlling form layout and types
 * @param endpoint - REST API endpoint (e.g., "/api/books/") for list/detail operations
 * @param recordId - Optional record ID; omit for create mode, provide for edit/view/delete
 * @param initialMode - Starting mode; defaults to "view" if recordId provided, else "create"
 * @param onSuccess - Optional callback fired after successful save or delete
 * @param onCancel - Optional callback fired when user cancels (create mode) or closes (view mode)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiState, FieldDef } from "@app-types/api";
import { fetchWithRetry } from "@/utils/api-fetch";
import { parseJsonResponse } from "@/utils/api-json";
import ErrorBanner from "@templates/error-banner";
import FieldInput from "@templates/field-input";
import { FormFieldLabel } from "@templates/form-field-label";

type EntryMode = "create" | "edit" | "view";

type EntryFormProps<TRow extends Record<string, unknown>> = {
  /** Field definitions — controls what is shown and how */
  fields: FieldDef<TRow>[];
  /** REST API endpoint base URL (e.g. "/api/books/") */
  endpoint: string;
  /** ID of the record to load for edit/view. Omit for create mode. */
  recordId?: string | number;
  /** Initial mode. Defaults to "create" when no recordId, otherwise "view". */
  initialMode?: EntryMode;
  /** Called after a successful save or delete */
  onSuccess?: (result: { mode: "saved" | "deleted"; data: TRow | null }) => void;
  /** Called when the user cancels */
  onCancel?: () => void;
  /** Optional values to pre-seed the create form (ignored when recordId is set) */
  initialValues?: Partial<Record<keyof TRow, unknown>>;
};

type FormValues = Record<string, unknown>;

function buildDefaultValues<TRow extends Record<string, unknown>>(
  fields: FieldDef<TRow>[]
): FormValues {
  const defaults: FormValues = {};
  for (const field of fields) {
    defaults[field.key] = field.type === "boolean" ? false : field.type === "number" ? "" : "";
  }

  return defaults;
}

function mapRecordToFormValues<TRow extends Record<string, unknown>>(
  fields: FieldDef<TRow>[],
  data: TRow
): FormValues {
  const loaded: FormValues = {};
  for (const field of fields) {
    loaded[field.key] = data[field.key] ?? "";
  }
  return loaded;
}

export default function EntryForm<TRow extends Record<string, unknown>>({
  fields,
  endpoint,
  recordId,
  initialMode,
  onSuccess,
  onCancel,
  initialValues,
}: EntryFormProps<TRow>) {
  const derivedInitialMode: EntryMode = initialMode ?? (recordId != null ? "view" : "create");

  const [mode, setMode] = useState<EntryMode>(derivedInitialMode);
  const [values, setValues] = useState<FormValues>(() => ({
    ...buildDefaultValues(fields),
    ...(recordId == null && initialValues ? initialValues : {}),
  }));
  const [fetchState, setFetchState] = useState<ApiState<TRow>>({ status: "idle" });
  const [saveState, setSaveState] = useState<ApiState<TRow>>({ status: "idle" });
  const [deleteState, setDeleteState] = useState<ApiState<null>>({ status: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const recordUrl = recordId != null ? `${endpoint.replace(/\/$/, "")}/${recordId}/` : null;

  // Reset all form state whenever the target record or field definitions change.
  // This covers the case where the parent component reuses this form for a different
  // record without unmounting it (e.g. clicking a different row in a grid).
  // Wrapped in `Promise.resolve().then()` to defer until after the current render cycle,
  // avoiding the "cannot update state during render" React warning.
  useEffect(() => {
    void Promise.resolve().then(() => {
      setMode(derivedInitialMode);
      setValues({
        ...buildDefaultValues(fields),
        ...(recordId == null && initialValues ? initialValues : {}),
      });
      setConfirmDelete(false);
      setFetchState({ status: "idle" });
      setSaveState({ status: "idle" });
      setDeleteState({ status: "idle" });
    });
  }, [derivedInitialMode, fields, initialValues, recordId]);

  const loadRecord = useCallback(async () => {
    if (!recordUrl) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetchState({ status: "loading" });

    try {
      const response = await fetchWithRetry(recordUrl, { signal: controller.signal });
      const data = await parseJsonResponse<TRow>(response);
      setFetchState({ status: "success", data });
      setValues(mapRecordToFormValues(fields, data));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFetchState({ status: "error", message: (err as Error).message });
    }
  }, [recordUrl, fields]);

  // Fetch the existing record whenever `recordId` is set (or changes).
  // The cleanup function aborts any in-flight request when the component unmounts or
  // `recordId` changes, preventing stale data from landing in state.
  // Deferred via `Promise.resolve()` for the same reason as the reset effect above.
  useEffect(() => {
    if (recordId != null) {
      void Promise.resolve().then(() => loadRecord());
    }
    return () => abortRef.current?.abort();
  }, [recordId, loadRecord]);

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveState({ status: "loading" });

    const isCreate = mode === "create";
    const url = isCreate ? endpoint : recordUrl!;
    const method = isCreate ? "POST" : "PATCH";

    try {
      const response = await fetchWithRetry(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await parseJsonResponse<TRow>(response);
      setSaveState({ status: "success", data });
      setMode("view");
      onSuccess?.({ mode: "saved", data });
    } catch (err) {
      setSaveState({ status: "error", message: (err as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!recordUrl) return;
    setDeleteState({ status: "loading" });

    try {
      const response = await fetchWithRetry(recordUrl, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      setDeleteState({ status: "success", data: null });
      onSuccess?.({ mode: "deleted", data: null });
    } catch (err) {
      setDeleteState({ status: "error", message: (err as Error).message });
    }
  };

  const isWorking =
    fetchState.status === "loading" ||
    saveState.status === "loading" ||
    deleteState.status === "loading";

  const isEditing = mode === "create" || mode === "edit";
  const errorMessages = [
    fetchState.status === "error" ? `Failed to load record: ${fetchState.message}` : null,
    saveState.status === "error" ? `Save failed: ${saveState.message}` : null,
    deleteState.status === "error" ? `Delete failed: ${deleteState.message}` : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <div className="form-section">
      {errorMessages.map((message) => (
        <ErrorBanner key={message} message={message} />
      ))}

      {/* Fields */}
      <div className="form-grid">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "sm:col-span-2" : ""}
          >
            <FormFieldLabel
              htmlFor={field.key}
              label={field.label}
              hintInfo={field.hint_info}
              required={field.required && isEditing}
            />
            <FieldInput
              field={field}
              value={values[field.key]}
              onChange={handleChange}
              disabled={!isEditing || isWorking}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="form-actions">
        {mode === "view" && (
          <>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="btn-primary"
            >
              Edit
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-danger-outline"
              >
                Delete
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Confirm delete?</span>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={handleDelete}
                  className="btn-danger disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </span>
            )}
          </>
        )}

        {isEditing && (
          <>
            <button
              type="button"
              disabled={isWorking}
              onClick={handleSave}
              className="btn-primary disabled:opacity-50"
            >
              {saveState.status === "loading" ? "Saving…" : "Save"}
            </button>

            <button
              type="button"
              disabled={isWorking}
              onClick={() => {
                if (mode === "edit") {
                  setMode("view");
                } else {
                  onCancel?.();
                }
              }}
              className="btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}

        {onCancel && mode === "view" && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto btn-secondary"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

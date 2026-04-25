import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiState, FieldDef } from "@app-types/api";
import { fetchWithRetry } from "@/utils/api-fetch";

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

function renderInput<TRow extends Record<string, unknown>>(
  field: FieldDef<TRow>,
  value: unknown,
  onChange: (key: string, val: unknown) => void,
  disabled: boolean
) {
  const baseClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900";

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

export default function EntryForm<TRow extends Record<string, unknown>>({
  fields,
  endpoint,
  recordId,
  initialMode,
  onSuccess,
  onCancel,
}: EntryFormProps<TRow>) {
  const derivedInitialMode: EntryMode = initialMode ?? (recordId != null ? "view" : "create");

  const [mode, setMode] = useState<EntryMode>(derivedInitialMode);
  const [values, setValues] = useState<FormValues>(buildDefaultValues(fields));
  const [fetchState, setFetchState] = useState<ApiState<TRow>>({ status: "idle" });
  const [saveState, setSaveState] = useState<ApiState<TRow>>({ status: "idle" });
  const [deleteState, setDeleteState] = useState<ApiState<null>>({ status: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const recordUrl = recordId != null ? `${endpoint.replace(/\/$/, "")}/${recordId}/` : null;

  const loadRecord = useCallback(async () => {
    if (!recordUrl) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetchState({ status: "loading" });

    try {
      const response = await fetchWithRetry(recordUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = (await response.json()) as TRow;
      setFetchState({ status: "success", data });
      const loaded: FormValues = {};
      for (const field of fields) {
        loaded[field.key] = data[field.key] ?? "";
      }
      setValues(loaded);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFetchState({ status: "error", message: (err as Error).message });
    }
  }, [recordUrl, fields]);

  useEffect(() => {
    if (recordId != null) {
      loadRecord();
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
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = (await response.json()) as TRow;
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

  return (
    <div className="space-y-6">
      {/* Error banners */}
      {fetchState.status === "error" && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Failed to load record: {fetchState.message}
        </p>
      )}
      {saveState.status === "error" && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Save failed: {saveState.message}
        </p>
      )}
      {deleteState.status === "error" && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Delete failed: {deleteState.message}
        </p>
      )}

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "sm:col-span-2" : ""}
          >
            <label
              htmlFor={field.key}
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {field.label}
              {field.required && isEditing && (
                <span className="ml-1 text-red-500" aria-hidden="true">*</span>
              )}
            </label>
            {renderInput(field, values[field.key], handleChange, !isEditing || isWorking)}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        {mode === "view" && (
          <>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Edit
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
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
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
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
              className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </>
        )}

        {onCancel && mode === "view" && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

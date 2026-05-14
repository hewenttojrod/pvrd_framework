/**
 * Utility functions for the schema mapping editor.
 * Provides role inference logic, a typed JSON fetch wrapper,
 * and a list-response normaliser that handles multiple backend response shapes.
 */
import { fetchWithRetry } from "@/utils/api-fetch";
import { parseJsonResponse } from "@/utils/api-json";
import type { FieldRow, InferredRole } from "./schema_mapping_editor.types";

export function inferRole(
  row: Pick<FieldRow, "unit_type_id" | "unit_type_name" | "column_label" | "include_in_ingestion">
): InferredRole {
  if (!row.include_in_ingestion) return "skipped";
  if (row.unit_type_id) {
    const isDatetime = row.unit_type_name?.includes("[datetime]");
    return isDatetime ? "timestamp" : "value";
  }
  if (row.column_label.trim()) return "dimension";
  return "unmapped";
}

export function fetchJson<T>(url: string): Promise<T> {
  return fetchWithRetry(url).then((response) => parseJsonResponse<T>(response));
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const listPayload = data as { items?: T[]; results?: T[] };
  return listPayload.items ?? listPayload.results ?? [];
}
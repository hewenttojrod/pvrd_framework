// /**
//  * Reusable data grid component displaying tabular data from a REST API.
//  * Features:
//  * - Sortable columns (uses DRF ordering convention: ?ordering=field or ?ordering=-field)
//  * - Async loading with refresh button
//  * - Optional right-click context menu for actions
//  * - Supports both array and paginated (results/count) response formats
//  * - Automatic cleanup of pending requests
//  * - Loading/error/empty states
//  * 
//  * @template TRow - Type of row data from API
//  * @param columns - Column definitions
//  * @param endpoint - Full REST API endpoint URL returning ApiListResponse<TRow> or TRow[]
//  * @param params - Optional query parameters to append to each request
//  * @param contextMenuActions - Optional right-click menu actions
//  */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiListResponse, ApiState, ColumnDef, GridActionContext, GridContextAction } from "@app-types/api";
import { fetchWithRetry, resolveApiUrl } from "@/utils/api-fetch";

const EMPTY_PARAMS: Record<string, string> = {};

type SortDir = "asc" | "desc";

type SortState = {
  key: string;
  dir: SortDir;
};

type DataGridProps<TRow extends Record<string, unknown>> = {
  /** Column definitions */
  columns: ColumnDef<TRow>[];
  /** Full URL of the REST API endpoint that returns ApiListResponse<TRow> */
  endpoint: string;
  /** Optional query params appended to each request */
  params?: Record<string, string>;
  /** Optional row key field used for partial row patch updates */
  rowKey?: keyof TRow;
  /** Optional updated rows to merge into existing successful grid state */
  rowPatches?: TRow[];
  /** Optional right-click menu actions for rows or grid background */
  contextMenuActions?: GridContextAction<TRow>[];
  /** Optional row click handler for opening detail viewers */
  onRowClick?: (row: TRow) => void;
  /** Optional callback invoked before the grid reloads via the toolbar refresh button */
  onRefresh?: () => void | Promise<void>;
  /** Optional layout options for sticky headers and bounded scroll area */
  layoutOptions?: {
    /** When true, table is forced to fill the parent width. */
    stretchToContainer?: boolean;
    /** When true, table header stays fixed while rows scroll. */
    stickyHeader?: boolean;
    /** Optional max height for row scroll area (for example: "60vh" or "480px"). */
    maxHeight?: string;
  };
};

type MenuState<TRow extends Record<string, unknown>> = {
  x: number;
  y: number;
  context: GridActionContext<TRow>;
};

async function fetchPage<TRow>(
  endpoint: string,
  params: Record<string, string>,
  signal: AbortSignal
): Promise<ApiListResponse<TRow>> {
  const url = new URL(resolveApiUrl(endpoint), window.location.origin);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const response = await fetchWithRetry(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ApiListResponse<TRow> | TRow[];

  if (Array.isArray(payload)) {
    return {
      results: payload,
      count: payload.length,
    };
  }

  // Django Ninja PageNumberPagination returns { items, count } — normalize to { results, count }
  const obj = payload as Record<string, unknown>;
  if ("items" in obj && !("results" in obj)) {
    return {
      results: obj.items as TRow[],
      count: typeof obj.count === "number" ? obj.count : (obj.items as TRow[]).length,
    };
  }

  return payload;
}

export default function DataGrid<TRow extends Record<string, unknown>>({
  columns,
  endpoint,
  params,
  rowKey,
  rowPatches,
  contextMenuActions,
  onRowClick,
  onRefresh,
  layoutOptions,
}: DataGridProps<TRow>) {
  const [state, setState] = useState<ApiState<ApiListResponse<TRow>>>({ status: "idle" });
  const [sort, setSort] = useState<SortState | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [menu, setMenu] = useState<MenuState<TRow> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paramsEntries = Object.entries(params ?? EMPTY_PARAMS).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const paramsKey = JSON.stringify(paramsEntries);

  useEffect(() => {
    if (!rowKey || !rowPatches || rowPatches.length === 0) {
      return;
    }

    setState((prev) => {
      if (prev.status !== "success") {
        return prev;
      }

      const patchMap = new Map<unknown, TRow>();
      for (const patch of rowPatches) {
        patchMap.set(patch[rowKey], patch);
      }

      if (patchMap.size === 0) {
        return prev;
      }

      const nextRows = prev.data.results.map((row) => {
        const patch = patchMap.get(row[rowKey]);
        return patch ?? row;
      });

      return {
        status: "success",
        data: {
          ...prev.data,
          results: nextRows,
        },
      };
    });
  }, [rowKey, rowPatches]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const queryParams = Object.fromEntries(JSON.parse(paramsKey) as Array<[string, string]>);
    if (sort) {
      queryParams["ordering"] = sort.dir === "asc" ? sort.key : `-${sort.key}`;
    }

    const run = async () => {
      setState({ status: "loading" });
      try {
        const data = await fetchPage<TRow>(endpoint, queryParams, controller.signal);
        setState({ status: "success", data });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ status: "error", message: (err as Error).message });
      }
    };

    void run();

    return () => controller.abort();
  }, [endpoint, paramsKey, refreshTick, sort]);

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  const rows = state.status === "success" ? state.data.results : [];
  const isLoading = state.status === "loading";
  const isError = state.status === "error";
  const visibleActions = useMemo(() => {
    if (!menu || !contextMenuActions?.length) return [];
    return contextMenuActions.filter((action) =>
      action.isVisible ? action.isVisible(menu.context) : true
    );
  }, [contextMenuActions, menu]);

  useEffect(() => {
    if (!menu) return;

    const closeMenu = () => setMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
      }
    };

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu]);

  const openContextMenu = (
    event: React.MouseEvent,
    row: TRow | null,
    rowIndex: number | null
  ) => {
    if (!contextMenuActions?.length) return;
    event.preventDefault();
    event.stopPropagation();

    setMenu({
      x: event.clientX,
      y: event.clientY,
      context: {
        row,
        rowIndex,
        hasRow: row != null,
      },
    });
  };

  const handleActionClick = (action: GridContextAction<TRow>) => {
    if (!menu) return;
    const isDisabled = action.isDisabled ? action.isDisabled(menu.context) : false;
    if (isDisabled) return;
    action.onClick(menu.context);
    setMenu(null);
  };

  const handleRefreshClick = () => {
    void onRefresh?.();
    setRefreshTick((tick) => tick + 1);
  };

  const stickyHeader = Boolean(layoutOptions?.stickyHeader);
  const stretchToContainer = layoutOptions?.stretchToContainer !== false;

  const tableElement = (
    <table className={[stretchToContainer ? "w-full min-w-full" : "w-full", "table-auto border-collapse text-sm"].join(" ")}>
      <thead className={["bg-slate-100 dark:bg-slate-800", stickyHeader ? "sticky top-0 z-10" : ""].join(" ")}>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className={[
                "px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300",
                col.sortable ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white" : "",
              ].join(" ")}
              onClick={() => toggleSort(col.key, col.sortable)}
              aria-sort={
                sort?.key === col.key
                  ? sort.dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              <span className="flex items-center gap-1">
                {col.label}
                {col.sortable && sort?.key === col.key && (
                  <span aria-hidden="true">{sort.dir === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {isLoading && (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400">
              Loading…
            </td>
          </tr>
        )}

        {isError && (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-red-500">
              {state.status === "error" ? state.message : ""}
            </td>
          </tr>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400">
              No records found.
            </td>
          </tr>
        )}

        {!isLoading &&
          rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={[
                "border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50",
                onRowClick ? "cursor-pointer" : "",
              ].join(" ")}
              onClick={() => onRowClick?.(row)}
              onContextMenu={(event) => openContextMenu(event, row, rowIdx)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full rounded-md border border-slate-200 dark:border-slate-700",
        stickyHeader ? "overflow-hidden" : "overflow-auto",
      ].join(" ")}
      onContextMenu={(event) => openContextMenu(event, null, null)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {state.status === "success" ? `${state.data.count} record${state.data.count !== 1 ? "s" : ""}` : ""}
        </span>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleRefreshClick}
          className="btn-sidebar disabled:opacity-50"
        >
          {isLoading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      {stickyHeader ? (
        <div
          className="overflow-auto"
          style={layoutOptions?.maxHeight ? { maxHeight: layoutOptions.maxHeight } : undefined}
        >
          {tableElement}
        </div>
      ) : (
        tableElement
      )}

      {menu && visibleActions.length > 0 && createPortal(
        <div
          className="fixed min-w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          style={{ left: menu.x, top: menu.y, zIndex: 2000 }}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {visibleActions.map((action) => {
            const disabled = action.isDisabled ? action.isDisabled(menu.context) : false;
            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => handleActionClick(action)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

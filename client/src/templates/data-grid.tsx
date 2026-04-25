import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Optional right-click menu actions for rows or grid background */
  contextMenuActions?: GridContextAction<TRow>[];
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

  return payload;
}

export default function DataGrid<TRow extends Record<string, unknown>>({
  columns,
  endpoint,
  params,
  contextMenuActions,
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

    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;

    setMenu({
      x,
      y,
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

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700"
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
          onClick={() => setRefreshTick((t) => t + 1)}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          {isLoading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full table-auto border-collapse text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800">
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
                className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
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

      {menu && visibleActions.length > 0 && (
        <div
          className="absolute z-50 min-w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          style={{ left: menu.x, top: menu.y }}
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
        </div>
      )}
    </div>
  );
}

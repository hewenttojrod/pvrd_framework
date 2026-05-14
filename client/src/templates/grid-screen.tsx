/**
 * Convenience composition of `FormBody` + `DataGrid` for standard list pages.
 *
 * Use this instead of wiring `FormBody` and `DataGrid` separately when the page
 * consists of a header and a full-width data table. Optional `children` are rendered
 * between the header and the grid (e.g. filter controls or action buttons).
 */
import type { PropsWithChildren } from "react";

import type { ColumnDef, GridContextAction } from "@app-types/api";
import DataGrid, { type DataGridLayoutOptions } from "@templates/data-grid";
import FormBody from "@templates/form-body";

type GridScreenProps<TRow extends Record<string, unknown>> = PropsWithChildren<{
  title: string;
  subtitle?: string;
  columns: ColumnDef<TRow>[];
  endpoint: string;
  params?: Record<string, string>;
  rowKey?: keyof TRow;
  rowPatches?: TRow[];
  contextMenuActions?: GridContextAction<TRow>[];
  onRefresh?: () => void | Promise<void>;
  layoutOptions?: DataGridLayoutOptions;
  className?: string;
  bodyClassName?: string;
}>;

export default function GridScreen<TRow extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  endpoint,
  params,
  rowKey,
  rowPatches,
  contextMenuActions,
  onRefresh,
  layoutOptions,
  className,
  bodyClassName,
  children,
}: GridScreenProps<TRow>) {
  return (
    <FormBody title={title} subtitle={subtitle} className={className} bodyClassName={bodyClassName}>
      {children}
      <DataGrid<TRow>
        columns={columns}
        endpoint={endpoint}
        params={params}
        rowKey={rowKey}
        rowPatches={rowPatches}
        contextMenuActions={contextMenuActions}
        onRefresh={onRefresh}
        layoutOptions={layoutOptions}
      />
    </FormBody>
  );
}
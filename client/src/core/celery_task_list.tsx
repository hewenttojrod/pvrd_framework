import { useMemo, useState } from "react";

import type { ColumnDef } from "@app-types/api";
import DataGrid from "@templates/data-grid";
import FormBody from "@templates/form-body";

const CELERY_TASKS_ENDPOINT = "/api/core/celery/tasks/";

type CeleryTaskRow = {
  task_id: string;
  task_name: string | null;
  status: string;
  worker: string | null;
  date_created: string | null;
  date_done: string | null;
  runtime: number | null;
  result_preview: string | null;
  traceback_preview: string | null;
};

export default function CeleryTaskList() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const renderTimestamp = (value: string | null) => {
    if (!value) {
      return "-";
    }
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
  };

  const columns: ColumnDef<CeleryTaskRow>[] = useMemo(
    () => [
      { key: "task_id", label: "Task ID", sortable: true },
      {
        key: "task_name",
        label: "Task Name",
        sortable: true,
        render: (_value, row) => row.task_name || "-",
      },
      { key: "status", label: "Status", sortable: true },
      {
        key: "worker",
        label: "Worker",
        render: (_value, row) => row.worker || "-",
      },
      {
        key: "date_created",
        label: "Created",
        render: (_value, row) => renderTimestamp(row.date_created),
      },
      {
        key: "date_done",
        label: "Completed",
        render: (_value, row) => renderTimestamp(row.date_done),
      },
      {
        key: "runtime",
        label: "Runtime (s)",
        render: (_value, row) =>
          typeof row.runtime === "number" ? row.runtime.toFixed(3) : "-",
      },
      {
        key: "result_preview",
        label: "Result",
        render: (_value, row) => row.result_preview || "-",
      },
      {
        key: "traceback_preview",
        label: "Traceback",
        render: (_value, row) => row.traceback_preview || "-",
      },
    ],
    []
  );

  return (
    <FormBody
      title="Background Tasks"
      subtitle="Live and completed Celery tasks from the shared task result backend."
    >
      <div className="mb-3 flex items-center gap-3">
        <label htmlFor="celery-task-status-filter" className="text-sm text-ui-body-text">
          Status
        </label>
        <select
          id="celery-task-status-filter"
          className="form-input max-w-52"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="STARTED">Started</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="RETRY">Retry</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>
      <DataGrid<CeleryTaskRow>
        columns={columns}
        endpoint={CELERY_TASKS_ENDPOINT}
        params={{
          limit: "1000",
          status: statusFilter === "ALL" ? "" : statusFilter,
        }}
      />
    </FormBody>
  );
}

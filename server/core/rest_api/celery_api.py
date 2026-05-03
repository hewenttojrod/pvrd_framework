from ninja import NinjaAPI, Query, Schema

from django_celery_results.models import TaskResult


class CeleryTaskSchema(Schema):
    task_id: str
    task_name: str | None
    status: str
    worker: str | None
    date_created: str | None
    date_done: str | None
    runtime: float | None
    result_preview: str | None
    traceback_preview: str | None


core_api = NinjaAPI(urls_namespace="core_api", docs_url="/docs")


@core_api.get("celery/tasks/", response=list[CeleryTaskSchema])
def list_celery_tasks(request, status: str | None = Query(default=None), limit: int = Query(default=500)):
    """Return recently created Celery task results, including completed and active tasks."""
    normalized_limit = max(1, min(limit, 2000))

    queryset = TaskResult.objects.all()
    if status:
        queryset = queryset.filter(status__iexact=status.strip())

    tasks = queryset.order_by("-date_done", "-date_created")[:normalized_limit]

    payload: list[dict[str, object]] = []
    for task in tasks:
        result_text = str(task.result or "")
        traceback_text = str(task.traceback or "")
        runtime_seconds: float | None = None
        if task.date_created and task.date_done:
            runtime_seconds = (task.date_done - task.date_created).total_seconds()

        payload.append(
            {
                "task_id": task.task_id,
                "task_name": task.task_name,
                "status": task.status,
                "worker": task.worker,
                "date_created": task.date_created.isoformat() if task.date_created else None,
                "date_done": task.date_done.isoformat() if task.date_done else None,
                "runtime": runtime_seconds,
                "result_preview": (result_text[:250] + "...") if len(result_text) > 250 else result_text,
                "traceback_preview": (traceback_text[:250] + "...")
                if len(traceback_text) > 250
                else traceback_text,
            }
        )

    return payload

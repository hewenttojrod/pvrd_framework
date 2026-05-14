"""
Celery settings for the pvrd_framework Django project.
Imported by config/settings.py after sys.path has been extended.
"""
import os

from src.registry.module_registry import REGISTERED_MODULES

# Broker: Redis running in the 'redis' Docker service.
CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")

# Store task results in the Django database (requires django_celery_results).
CELERY_RESULT_BACKEND: str = "django-db"

CELERY_TIMEZONE: str = "UTC"
CELERY_TASK_TRACK_STARTED: bool = True
CELERY_TASK_TIME_LIMIT: int = 30 * 60  # hard 30-minute cap per task

# Periodic scheduler ticks configured per module via each module's registry.py.
CELERY_BEAT_SCHEDULE: dict[str, dict[str, object]] = {}
for _module in REGISTERED_MODULES:
    _schedule_task = _module.schedule_task_path()
    if not _schedule_task:
        continue

    _interval_seconds = float(_module.schedule_interval_seconds or 60.0)
    CELERY_BEAT_SCHEDULE[f"{_module.name}-process-schedules"] = {
        "task": _schedule_task,
        "schedule": max(1.0, _interval_seconds),
    }

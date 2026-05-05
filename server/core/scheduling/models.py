from django.db import models

from core._models.base_model import BaseModel


class schedule_definition(BaseModel):
    """Core schedule table shared by all modules."""

    class run_state(models.TextChoices):
        IDLE = "IDLE", "Idle"
        QUEUED = "QUEUED", "Queued"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    module_name = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=255)
    mode = models.CharField(max_length=64, db_index=True)
    target_ref_id = models.BigIntegerField(null=True, blank=True)  # Module-owned FK id (for example report id)
    is_active = models.BooleanField(default=True, db_index=True)
    interval_minutes = models.PositiveIntegerField(default=1440)
    use_cache = models.BooleanField(default=True)
    run_async = models.BooleanField(default=True)

    # Common date-range controls; module task may choose to honor or ignore.
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    rolling_window_days = models.PositiveIntegerField(null=True, blank=True)

    # Module-specific augmentation payload.
    module_config_json = models.JSONField(default=dict, blank=True)

    next_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_state = models.CharField(max_length=16, choices=run_state.choices, default=run_state.IDLE)
    last_message = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["module_name", "is_active", "next_run_at"]),
            models.Index(fields=["module_name", "mode", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.module_name}:{self.name} [{self.mode}]"


class schedule_run(BaseModel):
    """Execution log rows for each schedule run."""

    class state(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    schedule_definition = models.ForeignKey(
        schedule_definition,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    module_name = models.CharField(max_length=100, db_index=True)
    triggered_by = models.CharField(max_length=20, default="scheduler")  # scheduler|manual
    state_value = models.CharField(max_length=16, choices=state.choices, default=state.QUEUED)
    celery_task_id = models.CharField(max_length=64, blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    records_targeted = models.IntegerField(default=0)
    files_downloaded = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    message = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["module_name", "state_value", "-created_at"]),
            models.Index(fields=["schedule_definition", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"module={self.module_name} schedule={self.schedule_definition_id} state={self.state_value}"

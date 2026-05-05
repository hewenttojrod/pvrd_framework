from django.db import models

from core._models.base_model import BaseModel


class source_file(BaseModel):
    """One row per discovered/downloaded source file."""

    source_system = models.CharField(max_length=50, db_index=True)
    source_url = models.CharField(max_length=1024, blank=True)
    source_file_name = models.CharField(max_length=512)
    storage_path = models.CharField(max_length=1024)
    file_type = models.CharField(max_length=20, default="CSV")  # CSV, ZIP, JSON, etc.
    checksum_sha256 = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)
    detected_report_date = models.DateField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["source_system", "detected_report_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.source_system}/{self.source_file_name}"


class parse_run(BaseModel):
    """One row per parser execution run (batch or single-file)."""

    class RunStatus(models.TextChoices):
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        PARTIAL = "PARTIAL", "Partial"

    source_system = models.CharField(max_length=50, db_index=True)
    runner_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=RunStatus.choices, default=RunStatus.RUNNING, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    context_json = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["source_system", "-started_at"]),
            models.Index(fields=["status", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.source_system} {self.runner_name} ({self.status})"


class parse_error(BaseModel):
    """Parser/ingestion errors at file or row level."""

    parse_run = models.ForeignKey(parse_run, on_delete=models.CASCADE, related_name="errors")
    source_file = models.ForeignKey(source_file, on_delete=models.CASCADE, null=True, blank=True, related_name="parse_errors")
    row_number = models.IntegerField(null=True, blank=True)
    error_type = models.CharField(max_length=100)
    error_message = models.TextField()
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["parse_run"]),
            models.Index(fields=["source_file"]),
            models.Index(fields=["error_type"]),
        ]

    def __str__(self):
        return f"Error in {self.parse_run}: {self.error_type}"

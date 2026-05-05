from django.db import models
from django.db.models import F

from core._models.base_model import BaseModel
from core.ingestion import source_file
from core.metrics import column_mapping


class timeseries_point(BaseModel):
    """Central long-format time-series table for graphing and cross-report comparison."""

    source_file = models.ForeignKey(source_file, on_delete=models.CASCADE, related_name="timeseries_points")
    column_mapping = models.ForeignKey(column_mapping, on_delete=models.SET_NULL, null=True, blank=True, related_name="timeseries_points")
    ts_utc = models.DateTimeField(db_index=True)
    value_json = models.JSONField(default=dict)
    quality_flag = models.CharField(max_length=50, null=True, blank=True)
    source_row_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                F("column_mapping"),
                F("ts_utc"),
                name="core_timeseries_point_dedup_uq",
            )
        ]
        indexes = [
            models.Index(fields=["-ts_utc"]),
            models.Index(fields=["column_mapping", "-ts_utc"]),
        ]

    def __str__(self):
        return f"{self.column_mapping.semantic_key} @ {self.ts_utc}: {self.value_json}"


class timeseries_batch_audit(BaseModel):
    """Batch-level audit trail for raw_record -> timeseries mapping reads/writes."""

    class AuditStatus(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        FAILED = "FAILED", "Failed"

    source_file = models.ForeignKey(source_file, on_delete=models.CASCADE, related_name="timeseries_batch_audits")
    parse_run = models.ForeignKey("core.parse_run", on_delete=models.CASCADE, related_name="timeseries_batch_audits")
    report_code = models.CharField(max_length=64, db_index=True)
    batch_index = models.PositiveIntegerField()
    batch_start_row = models.IntegerField()
    batch_end_row = models.IntegerField()
    rows_read = models.IntegerField(default=0)
    points_attempted = models.IntegerField(default=0)
    points_written = models.IntegerField(default=0)
    duplicates_estimated = models.IntegerField(default=0)
    pre_validation_ok = models.BooleanField(default=True)
    post_validation_ok = models.BooleanField(default=True)
    invalid_timestamp_count = models.IntegerField(default=0)
    off_interval_count = models.IntegerField(default=0)
    gap_count = models.IntegerField(default=0)
    status = models.CharField(max_length=16, choices=AuditStatus.choices, default=AuditStatus.SUCCESS, db_index=True)
    details_json = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["report_code", "batch_index"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["source_file", "-created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.report_code} batch={self.batch_index} rows={self.batch_start_row}-{self.batch_end_row} "
            f"status={self.status}"
        )

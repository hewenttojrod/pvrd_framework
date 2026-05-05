"""Core app models - imports from feature folders for backward compatibility."""

from django.db import models
from core._models.base_model import BaseModel

# Feature Set 1: File Ingestion Lifecycle
from core.ingestion import source_file, parse_run, parse_error

# Feature Set 2: Schema and Column Mapping
from core.metrics import unit_type, column_mapping

# Feature Set 3: Time-Series Storage
from core.timeseries import timeseries_point, timeseries_batch_audit

# Feature Set 4: Raw Row Staging
from core.raw import raw_record

# Feature Set 5: Cross-module Scheduling
from core.scheduling import schedule_definition, schedule_run

# Feature Set 6: Chart Definitions
from core.charts import chart_definition


class dummy_table(BaseModel):
    char_field = models.CharField(max_length=200)
    text_field = models.TextField(blank=True)
    int_field  = models.IntegerField()
    date_field = models.DateField()


__all__ = [
    "dummy_table",
    # Ingestion
    "source_file",
    "parse_run",
    "parse_error",
    # Metrics / Mapping
    "unit_type",
    "column_mapping",
    # Timeseries
    "timeseries_point",
    "timeseries_batch_audit",
    # Raw
    "raw_record",
    # Scheduling
    "schedule_definition",
    "schedule_run",
    # Charts
    "chart_definition",
]
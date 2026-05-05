from django.db import models

from core._models.base_model import BaseModel


class chart_definition(BaseModel):
    """
    Stores a user-built chart configuration for the chart prototype page.

    config_json holds the full ECharts-compatible definition:
      - chart_type: "line" | "bar" | "scatter" | "area" | "pie" | "heatmap"
      - source_system: e.g. "nyiso"
      - dataset_key: e.g. "DAM_LBMP_ZONE"
      - x_field: column name used for x-axis (typically a timestamp column)
      - y_fields: list of column names used as series
      - dimension_filter: optional dict of dimension_type -> dimension_key
      - date_from: ISO date string
      - date_to: ISO date string
      - aggregation: "none" | "hourly" | "daily" | "monthly"
      - style_overrides: arbitrary ECharts option fragment merged at render time
    """

    class ChartType(models.TextChoices):
        LINE = "line", "Line"
        BAR = "bar", "Bar"
        SCATTER = "scatter", "Scatter"
        AREA = "area", "Area"
        PIE = "pie", "Pie"
        HEATMAP = "heatmap", "Heatmap"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    chart_type = models.CharField(
        max_length=20,
        choices=ChartType.choices,
        default=ChartType.LINE,
        db_index=True,
    )
    # Full chart specification stored as JSONB
    config_json = models.JSONField(default=dict, blank=True)
    # Snapshot of the last data query result (optional — used for quick reload)
    last_data_json = models.JSONField(default=dict, blank=True)
    is_pinned = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["chart_type"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} [{self.chart_type}]"

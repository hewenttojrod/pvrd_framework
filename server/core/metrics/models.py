from django.db import models

from core._models.base_model import BaseModel


class unit_type(BaseModel):
    """Physical unit / semantic type registry. Each entry is a reusable semantic key
    shared across column mappings (e.g. MW, USD/MWh, datetime)."""

    class BaseDataType(models.TextChoices):
        FLOAT = "float", "Float"
        INT = "int", "Integer"
        BOOL = "bool", "Boolean"
        STRING = "string", "String"
        DATETIME = "datetime", "Datetime"

    unit_name = models.CharField(max_length=100)
    base_data_type = models.CharField(max_length=20, choices=BaseDataType.choices, default=BaseDataType.FLOAT)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.unit_name} [{self.base_data_type}]"


class column_mapping(BaseModel):
    """Maps a raw source column to a canonical semantic key and optional unit type."""

    source_system = models.CharField(max_length=50, db_index=True)
    dataset_key = models.CharField(max_length=255)
    raw_column = models.CharField(max_length=255)
    semantic_key = models.CharField(max_length=255, blank=True)
    unit_type = models.ForeignKey(
        unit_type,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="column_mappings",
    )
    column_label = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    include_in_ingestion = models.BooleanField(default=True)

    class Meta:
        unique_together = [("source_system", "dataset_key", "raw_column")]
        indexes = [
            models.Index(fields=["unit_type"]),
        ]

    def __str__(self):
        return f"{self.source_system}:{self.dataset_key}:{self.raw_column}"

from django.db import models

from core._models.base_model import BaseModel
from core.ingestion import source_file, parse_run


class raw_record(BaseModel):
    """Raw normalized row JSON linked to file and parse run."""

    source_file = models.ForeignKey(source_file, on_delete=models.CASCADE, related_name="raw_records")
    parse_run = models.ForeignKey(parse_run, on_delete=models.CASCADE, related_name="raw_records")
    row_number = models.IntegerField()
    row_payload_json = models.JSONField()
    row_hash = models.CharField(max_length=64)

    class Meta:
        unique_together = [("source_file", "row_hash")]
        indexes = [
            models.Index(fields=["source_file", "row_number"]),
        ]

    def __str__(self):
        return f"{self.source_file} row {self.row_number}"

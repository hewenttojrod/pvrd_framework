from django.db import models

from core._models.base_model import BaseModel


class dummy_table(BaseModel):
    char_field = models.CharField(max_length=200)
    text_field = models.TextField(blank=True)
    int_field  = models.IntegerField()
    date_field = models.DateField()
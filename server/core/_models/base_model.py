from django.db import models
from django.db.models.base import ModelBase


class ModuleModelBase(ModelBase):
    def __new__(mcls, name, bases, attrs, **kwargs):
        cls = super().__new__(mcls, name, bases, attrs, **kwargs)

        if cls._meta.abstract:
            return cls

        # If model keeps Django's default table naming pattern, rewrite it to
        # include module name instead of app label (e.g. bookstore_book).
        default_table = f"{cls._meta.app_label}_{cls._meta.model_name}"
        if cls._meta.db_table == default_table:
            module_root = cls.__module__.split(".")[0].lower()
            cls._meta.db_table = f"{module_root}_{cls._meta.model_name}"
            cls._meta.original_attrs["db_table"] = cls._meta.db_table

        pk_field = cls._meta.pk
        if pk_field is not None and pk_field.name == "id" and not pk_field.db_column:
            pk_field.db_column = f"{cls._meta.model_name}_id"

        return cls


class BaseModel(models.Model, metaclass=ModuleModelBase):
    """Common base model with timestamp fields."""

    id = models.BigAutoField(primary_key=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
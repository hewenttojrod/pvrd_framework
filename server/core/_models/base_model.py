from django.db import models
from django.db.models.base import ModelBase


class ModuleModelBase(ModelBase):
    def __new__(mcls, name, bases, attrs, **kwargs):
        meta = attrs.get("Meta")
        is_abstract = bool(meta and getattr(meta, "abstract", False))

        if not is_abstract and "id" not in attrs:
            attrs[f"{name.lower()}_id"] = models.BigAutoField(
                primary_key=True,
                db_column=f"{name.lower()}_id",
            )

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

        return cls


class BaseModel(models.Model, metaclass=ModuleModelBase):
    """Common base model with timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
"""Shared lightweight helpers used across src modules.

Contains safe conversions and JSON-serialization helpers extracted from
`get_armor_gear.py` to avoid duplication.
"""
from typing import Any, Dict, List
from dataclasses import MISSING


def to_dict_safe(entry: Any) -> Dict[str, Any]:
    """Return a plain dict representation for a variety of object shapes.

    - If ``entry`` is None -> {}
    - If it's already a dict -> returned as-is
    - If it defines ``to_dict()`` -> call it (guarded)
    - Otherwise fall back to ``__dict__`` when available
    - On attribute/typing errors return {} safely
    """
    if entry is None:
        return {}
    if isinstance(entry, dict):
        return entry
    try:
        if hasattr(entry, "to_dict"):
            return entry.to_dict() or {}
    except (AttributeError, TypeError):
        pass
    try:
        return getattr(entry, "__dict__", {}) or {}
    except (AttributeError, TypeError):
        return {}


def make_json_serializable(obj: Any) -> Any:
    """Recursively convert an object into JSON-serializable primitives.

    - Replaces ``dataclasses.MISSING`` with ``None``
    - Converts model-like objects using ``to_dict_safe``
    - Converts lists/tuples/sets and dicts recursively
    - Falls back to ``str()`` when conversion fails
    """
    # primitives
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    # dataclasses sentinel
    if obj is MISSING:
        return None
    # dict-like
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    # list/tuple/set
    if isinstance(obj, (list, tuple, set)):
        return [make_json_serializable(x) for x in obj]
    # try to convert model/object to dict
    try:
        d = to_dict_safe(obj)
        if isinstance(d, dict) and d:
            return make_json_serializable(d)
    except (TypeError, AttributeError):
        pass
    # fallback: string representation
    try:
        return str(obj)
    except (TypeError, ValueError):
        return None


def get_field(entry: Any, *keys: str, default: Any = None) -> Any:
    """Return the first non-None value for candidate keys on ``entry``.

    Checks dict keys first, then attributes. Returns ``default`` when nothing
    found. Safe for model-like objects and dicts.
    """
    d = to_dict_safe(entry)
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    # try attributes as fallback
    for k in keys:
        if hasattr(entry, k):
            try:
                val = getattr(entry, k)
                if val is not None:
                    return val
            except (AttributeError, TypeError):
                pass
    return default

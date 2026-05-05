"""
Core Chart API — chart_definition CRUD + timeseries query for the chart prototype page.

Endpoints:
    GET  /api/core/charts/definitions/          – list saved charts
    POST /api/core/charts/definitions/          – save new chart
    PUT  /api/core/charts/definitions/{id}/     – update chart
    DELETE /api/core/charts/definitions/{id}/   – delete chart
    GET  /api/core/charts/timeseries/           – query timeseries_point data
    GET  /api/core/charts/dimensions/           – list available dimension_type/key combos
    GET  /api/core/charts/column-mappings/      – list available source_system / dataset_key / column combos
    GET  /api/core/charts/timeseries/points/    – paginated timeseries point explorer with raw-record drill-down
    GET  /api/core/charts/timeseries/raw-record/ – return raw CSV row for a given timeseries_point_id
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from ninja import NinjaAPI, Query, Schema
from ninja.errors import HttpError
from pydantic import Field

from core.charts import chart_definition
from core.metrics import column_mapping
from core.raw import raw_record
from core.timeseries import timeseries_point


chart_api = NinjaAPI(urls_namespace="chart_api", docs_url="/docs")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChartDefinitionIn(Schema):
    name: str = Field(..., max_length=255)
    description: str = ""
    chart_type: str = "line"
    config_json: dict[str, Any] = {}
    last_data_json: dict[str, Any] = {}
    is_pinned: bool = False


class ChartDefinitionOut(Schema):
    chart_definition_id: int
    name: str
    description: str
    chart_type: str
    config_json: dict[str, Any]
    last_data_json: dict[str, Any]
    is_pinned: bool
    created_at: datetime
    updated_at: datetime


class TimeseriesPointOut(Schema):
    ts_utc: str
    value_num: float
    dimension_key: str | None
    semantic_key: str | None
    unit_name: str | None


class ColumnMappingOut(Schema):
    column_mapping_id: int
    source_system: str
    dataset_key: str
    raw_column: str
    semantic_key: str
    column_label: str
    unit_name: str | None
    base_data_type: str | None


class DimensionOut(Schema):
    dimension_key: str


# ---------------------------------------------------------------------------
# Chart Definition CRUD
# ---------------------------------------------------------------------------


@chart_api.get("definitions/", response=list[ChartDefinitionOut])
def list_chart_definitions(request):
    return [
        {
            "chart_definition_id": c.chart_definition_id,
            "name": c.name,
            "description": c.description,
            "chart_type": c.chart_type,
            "config_json": c.config_json,
            "last_data_json": c.last_data_json,
            "is_pinned": c.is_pinned,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }
        for c in chart_definition.objects.all().order_by("-is_pinned", "-updated_at")
    ]


@chart_api.post("definitions/", response=ChartDefinitionOut)
def create_chart_definition(request, payload: ChartDefinitionIn):
    obj = chart_definition.objects.create(
        name=payload.name,
        description=payload.description,
        chart_type=payload.chart_type,
        config_json=payload.config_json,
        last_data_json=payload.last_data_json,
        is_pinned=payload.is_pinned,
    )
    return {
        "chart_definition_id": obj.chart_definition_id,
        "name": obj.name,
        "description": obj.description,
        "chart_type": obj.chart_type,
        "config_json": obj.config_json,
        "last_data_json": obj.last_data_json,
        "is_pinned": obj.is_pinned,
        "created_at": obj.created_at,
        "updated_at": obj.updated_at,
    }


@chart_api.put("definitions/{chart_id}/", response=ChartDefinitionOut)
def update_chart_definition(request, chart_id: int, payload: ChartDefinitionIn):
    try:
        obj = chart_definition.objects.get(pk=chart_id)
    except chart_definition.DoesNotExist:
        return chart_api.create_response(request, {"detail": "Not found"}, status=404)
    obj.name = payload.name
    obj.description = payload.description
    obj.chart_type = payload.chart_type
    obj.config_json = payload.config_json
    obj.last_data_json = payload.last_data_json
    obj.is_pinned = payload.is_pinned
    obj.save()
    return {
        "chart_definition_id": obj.chart_definition_id,
        "name": obj.name,
        "description": obj.description,
        "chart_type": obj.chart_type,
        "config_json": obj.config_json,
        "last_data_json": obj.last_data_json,
        "is_pinned": obj.is_pinned,
        "created_at": obj.created_at,
        "updated_at": obj.updated_at,
    }


@chart_api.delete("definitions/{chart_id}/")
def delete_chart_definition(request, chart_id: int):
    deleted, _ = chart_definition.objects.filter(pk=chart_id).delete()
    if deleted:
        return {"success": True}
    return chart_api.create_response(request, {"detail": "Not found"}, status=404)


# ---------------------------------------------------------------------------
# Column mapping discovery
# ---------------------------------------------------------------------------


@chart_api.get("column-mappings/", response=list[ColumnMappingOut])
def list_column_mappings(
    request,
    source_system: str | None = Query(default=None),
    dataset_key: str | None = Query(default=None),
):
    qs = column_mapping.objects.select_related("unit_type").order_by(
        "source_system", "dataset_key", "raw_column"
    )
    if source_system:
        qs = qs.filter(source_system__iexact=source_system.strip())
    if dataset_key:
        qs = qs.filter(dataset_key__iexact=dataset_key.strip())

    return [
        {
            "column_mapping_id": cm.column_mapping_id,
            "source_system": cm.source_system,
            "dataset_key": cm.dataset_key,
            "raw_column": cm.raw_column,
            "semantic_key": cm.semantic_key,
            "column_label": cm.column_label,
            "unit_name": cm.unit_type.unit_name if cm.unit_type else None,
            "base_data_type": cm.unit_type.base_data_type if cm.unit_type else None,
        }
        for cm in qs
    ]


# ---------------------------------------------------------------------------
# Dimension discovery
# ---------------------------------------------------------------------------


@chart_api.get("dimensions/", response=list[DimensionOut])
def list_dimensions(
    request,
    source_system: str | None = Query(default=None),
    dataset_key: str | None = Query(default=None),
):
    """Return distinct dimension keys from value_json payloads in timeseries_point."""
    qs = timeseries_point.objects.all()
    if source_system or dataset_key:
        cm_filter: dict[str, str] = {}
        if source_system:
            cm_filter["column_mapping__source_system__iexact"] = source_system.strip()
        if dataset_key:
            cm_filter["column_mapping__dataset_key__iexact"] = dataset_key.strip()
        qs = qs.filter(**cm_filter)
    dim_keys: set[str] = set()
    for value_json in qs.values_list("value_json", flat=True)[:5000]:
        if isinstance(value_json, dict):
            dim_keys.update(str(k) for k in value_json.keys())
    return [{"dimension_key": key} for key in sorted(dim_keys)[:500]]


# ---------------------------------------------------------------------------
# Timeseries data query
# ---------------------------------------------------------------------------

def _bucket_ts(ts: datetime, aggregation: str) -> datetime:
    if aggregation == "hourly":
        return ts.replace(minute=0, second=0, microsecond=0)
    if aggregation == "daily":
        return ts.replace(hour=0, minute=0, second=0, microsecond=0)
    if aggregation == "monthly":
        return ts.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return ts


@chart_api.get("timeseries/", response=list[TimeseriesPointOut])
def query_timeseries(
    request,
    column_mapping_id: int | None = Query(default=None),
    source_system: str | None = Query(default=None),
    dataset_key: str | None = Query(default=None),
    semantic_key: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    dimension_key: str | None = Query(default=None),
    split_dimensions: bool = Query(default=False),
    aggregation: str = Query(default="none"),  # none | hourly | daily | monthly
    agg_func: str = Query(default="sum"),      # avg | sum | min | max
    limit: int = Query(default=2000),
):
    """
    Query timeseries_point data with optional filtering and aggregation.
    Returns at most `limit` rows (capped at 10 000).
    """
    safe_limit = max(1, min(limit, 10_000))

    qs = timeseries_point.objects.select_related("column_mapping__unit_type")

    # -- column filter
    if column_mapping_id:
        qs = qs.filter(column_mapping_id=column_mapping_id)
    else:
        if source_system:
            qs = qs.filter(column_mapping__source_system__iexact=source_system.strip())
        if dataset_key:
            qs = qs.filter(column_mapping__dataset_key__iexact=dataset_key.strip())
        if semantic_key:
            qs = qs.filter(column_mapping__semantic_key__iexact=semantic_key.strip())

    # -- time range filter
    if date_from:
        qs = qs.filter(ts_utc__date__gte=date_from)
    if date_to:
        qs = qs.filter(ts_utc__date__lte=date_to)

    rows = qs.values("ts_utc", "value_json")
    grouped: dict[tuple[datetime, str | None], list[float]] = {}

    for row in rows:
        ts_bucket = _bucket_ts(row["ts_utc"], aggregation)
        value_json = row.get("value_json") or {}
        if not isinstance(value_json, dict):
            continue

        if split_dimensions:
            for dim_key, raw_value in value_json.items():
                if dimension_key and str(dim_key).strip().lower() != dimension_key.strip().lower():
                    continue
                try:
                    numeric_value = float(raw_value)
                except (TypeError, ValueError):
                    continue
                grouped.setdefault((ts_bucket, str(dim_key)), []).append(numeric_value)
        else:
            acc = 0.0
            found = False
            for dim_key, raw_value in value_json.items():
                if dimension_key and str(dim_key).strip().lower() != dimension_key.strip().lower():
                    continue
                try:
                    acc += float(raw_value)
                    found = True
                except (TypeError, ValueError):
                    continue
            if found:
                grouped.setdefault((ts_bucket, dimension_key.strip() if dimension_key else None), []).append(acc)

    def _aggregate(values: list[float]) -> float:
        if not values:
            return 0.0
        if agg_func == "avg":
            return sum(values) / len(values)
        if agg_func == "min":
            return min(values)
        if agg_func == "max":
            return max(values)
        return sum(values)

    ordered = sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1] or ""))[:safe_limit]

    semantic_value = semantic_key.strip() if semantic_key else None
    if semantic_value is None and column_mapping_id:
        cm = (
            column_mapping.objects.select_related("unit_type")
            .filter(column_mapping_id=column_mapping_id)
            .first()
        )
        semantic_value = cm.semantic_key if cm else None
        unit_value = cm.unit_type.unit_name if cm and cm.unit_type else None
    else:
        unit_value = None

    return [
        {
            "ts_utc": key[0].isoformat(),
            "value_num": _aggregate(values),
            "dimension_key": key[1],
            "semantic_key": semantic_value,
            "unit_name": unit_value,
        }
        for key, values in ordered
    ]


# ---------------------------------------------------------------------------
# Timeseries point explorer (paginated list + raw-record drill-down)
# ---------------------------------------------------------------------------


class TimeseriesPointListOut(Schema):
    timeseries_point_id: int
    ts_utc: str
    column_mapping_id: int | None
    column_label: str | None
    semantic_key: str | None
    unit_name: str | None
    value_json: dict[str, Any]
    quality_flag: str | None
    source_file_id: int
    source_file_name: str


class TimeseriesListResponseOut(Schema):
    count: int
    results: list[TimeseriesPointListOut]


class RawRecordOut(Schema):
    raw_record_id: int
    row_number: int
    row_payload_json: dict[str, Any]
    source_file_id: int
    source_file_name: str


_ALLOWED_TP_ORDERINGS: dict[str, str] = {
    "ts_utc": "ts_utc",
    "-ts_utc": "-ts_utc",
    "column_mapping_id": "column_mapping_id",
    "-column_mapping_id": "-column_mapping_id",
    "source_file_id": "source_file_id",
    "-source_file_id": "-source_file_id",
}


@chart_api.get("timeseries/points/", response=TimeseriesListResponseOut)
def list_timeseries_points(
    request,
    column_mapping_ids: str | None = Query(default=None),
    source_system: str | None = Query(default=None),
    dataset_key: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    ordering: str = Query(default="-ts_utc"),
    limit: int = Query(default=500),
) -> dict[str, Any]:
    """
    Paginated timeseries point explorer.
    Filter by column_mapping_ids (comma-separated), source_system, dataset_key, and date range.
    Results are capped at 2 000 rows; pass limit to adjust (max 2 000).
    Returns {count, results} compatible with the DataGrid ApiListResponse contract.
    """
    safe_limit = max(1, min(limit, 2000))

    qs = timeseries_point.objects.select_related(
        "column_mapping__unit_type", "source_file"
    )

    if column_mapping_ids:
        parsed_ids = [
            int(tok.strip())
            for tok in column_mapping_ids.split(",")
            if tok.strip().isdigit()
        ]
        if parsed_ids:
            qs = qs.filter(column_mapping_id__in=parsed_ids)
    elif source_system or dataset_key:
        if source_system:
            qs = qs.filter(column_mapping__source_system__iexact=source_system.strip())
        if dataset_key:
            qs = qs.filter(column_mapping__dataset_key__iexact=dataset_key.strip())

    if date_from:
        qs = qs.filter(ts_utc__date__gte=date_from)
    if date_to:
        qs = qs.filter(ts_utc__date__lte=date_to)

    orm_order = _ALLOWED_TP_ORDERINGS.get(ordering, "-ts_utc")
    qs = qs.order_by(orm_order)

    total = qs.count()
    rows = qs[:safe_limit]

    return {
        "count": total,
        "results": [
            {
                "timeseries_point_id": tp.timeseries_point_id,
                "ts_utc": tp.ts_utc.isoformat(),
                "column_mapping_id": tp.column_mapping_id,
                "column_label": tp.column_mapping.column_label if tp.column_mapping else None,
                "semantic_key": tp.column_mapping.semantic_key if tp.column_mapping else None,
                "unit_name": (
                    tp.column_mapping.unit_type.unit_name
                    if tp.column_mapping and tp.column_mapping.unit_type
                    else None
                ),
                "value_json": tp.value_json or {},
                "quality_flag": tp.quality_flag,
                "source_file_id": tp.source_file_id,
                "source_file_name": tp.source_file.source_file_name,
            }
            for tp in rows
        ],
    }


@chart_api.get("timeseries/raw-record/", response=RawRecordOut)
def get_timeseries_raw_record(
    request,
    timeseries_point_id: int,
) -> dict[str, Any]:
    """
    Return the raw CSV row (row_payload_json) that produced a given timeseries_point.
    Looks up via source_file_id + source_row_hash → raw_record.row_hash.
    """
    try:
        tp = timeseries_point.objects.select_related("source_file").get(
            pk=timeseries_point_id
        )
    except timeseries_point.DoesNotExist:
        raise HttpError(404, "Timeseries point not found")

    try:
        rr = raw_record.objects.get(
            source_file_id=tp.source_file_id,
            row_hash=tp.source_row_hash,
        )
    except raw_record.DoesNotExist:
        raise HttpError(404, "Raw record not found for this timeseries point")

    return {
        "raw_record_id": rr.raw_record_id,
        "row_number": rr.row_number,
        "row_payload_json": rr.row_payload_json or {},
        "source_file_id": tp.source_file_id,
        "source_file_name": tp.source_file.source_file_name,
    }

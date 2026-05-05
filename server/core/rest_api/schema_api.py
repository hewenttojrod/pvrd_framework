import re
from dataclasses import dataclass
from typing import Optional

from ninja import NinjaAPI, Query, Schema
from ninja.pagination import paginate, PageNumberPagination
from django.shortcuts import get_object_or_404

from core.models import column_mapping, raw_record, source_file, unit_type


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _suggest_semantic_key(raw_column: str) -> str:
    """Convert a raw column name to a snake_case semantic key suggestion."""
    val = raw_column.lower().strip()
    val = re.sub(r"[^a-z0-9]+", "_", val)
    return val.strip("_")


def _resolve_dataset_key(src: source_file) -> str:
    if src.source_system.lower() == "nyiso":
        prefetched = getattr(src, "_prefetched_objects_cache", {}).get("nyiso_reports")
        if prefetched is not None:
            report_link = prefetched[0] if prefetched else None
        else:
            report_link = src.nyiso_reports.select_related("nyiso_report").first()

        if report_link and report_link.nyiso_report:
            return report_link.nyiso_report.code
    return src.source_file_name


def _infer_role(mapping: column_mapping) -> str:
    if not mapping.include_in_ingestion:
        return "skipped"
    if mapping.unit_type_id:
        if mapping.unit_type and mapping.unit_type.base_data_type == "datetime":
            return "timestamp"
        return "value"
    if mapping.column_label.strip():
        return "dimension"
    return "unmapped"


# ---------------------------------------------------------------------------
# Dataclasses (internal collection helpers)
# ---------------------------------------------------------------------------

@dataclass
class SourceMappingSummaryRow:
    source_system: str
    dataset_key: str
    file_count: int
    raw_field_count: int
    mapped_field_count: int
    unmapped_field_count: int
    sample_unmapped_fields: list[str]


@dataclass
class ColumnMappingFieldRow:
    raw_column: str
    column_mapping_id: Optional[int]
    is_mapped: bool
    semantic_key: str
    unit_type_id: Optional[int]
    unit_type_name: Optional[str]
    column_label: str
    notes: str
    include_in_ingestion: bool
    inferred_role: str
    suggested_semantic_key: str


def _collect_source_mapping_summaries() -> list[SourceMappingSummaryRow]:
    files = list(
        source_file.objects.filter(raw_records__isnull=False)
        .distinct()
        .only("source_file_id", "source_system", "source_file_name")
        .prefetch_related("nyiso_reports__nyiso_report")
        .order_by("source_system", "source_file_name")
    )

    file_to_group: dict[int, tuple[str, str]] = {}
    grouped_fields: dict[tuple[str, str], set[str]] = {}
    grouped_file_ids: dict[tuple[str, str], set[int]] = {}

    for src in files:
        dataset_key = _resolve_dataset_key(src)
        group_key = (src.source_system, dataset_key)
        file_to_group[src.source_file_id] = group_key
        grouped_fields.setdefault(group_key, set())
        grouped_file_ids.setdefault(group_key, set()).add(src.source_file_id)

    file_ids = list(file_to_group.keys())
    if file_ids:
        sample_rows = raw_record.objects.filter(
            source_file_id__in=file_ids,
            row_number__lte=25,
        ).values_list("source_file_id", "row_payload_json")

        for source_file_id, payload in sample_rows:
            group_key = file_to_group.get(source_file_id)
            if not group_key:
                continue
            payload_dict = payload or {}
            grouped_fields[group_key].update(str(key) for key in payload_dict.keys())

    mapping_keys: set[tuple[str, str, str]] = {
        (item.source_system.lower(), item.dataset_key.lower(), item.raw_column)
        for item in column_mapping.objects.only("source_system", "dataset_key", "raw_column")
    }

    summaries: list[SourceMappingSummaryRow] = []
    for (group_source_system, group_dataset_key), field_names in sorted(grouped_fields.items()):
        mapped_fields = [
            f for f in sorted(field_names)
            if (group_source_system.lower(), group_dataset_key.lower(), f) in mapping_keys
        ]
        unmapped_fields = [f for f in sorted(field_names) if f not in mapped_fields]
        summaries.append(
            SourceMappingSummaryRow(
                source_system=group_source_system,
                dataset_key=group_dataset_key,
                file_count=len(grouped_file_ids[(group_source_system, group_dataset_key)]),
                raw_field_count=len(field_names),
                mapped_field_count=len(mapped_fields),
                unmapped_field_count=len(unmapped_fields),
                sample_unmapped_fields=unmapped_fields[:5],
            )
        )
    return summaries


def _collect_column_mapping_fields(source_system: str, dataset_key: str) -> list[ColumnMappingFieldRow]:
    files = list(
        source_file.objects.filter(source_system__iexact=source_system)
        .only("source_file_id", "source_file_name", "source_system")
        .prefetch_related("nyiso_reports__nyiso_report")
        .order_by("source_file_id")
    )
    matching_file_ids = [
        src.source_file_id
        for src in files
        if _resolve_dataset_key(src).lower() == dataset_key.lower()
    ]

    field_names: set[str] = set()
    if matching_file_ids:
        sample_rows = raw_record.objects.filter(
            source_file_id__in=matching_file_ids,
            row_number__lte=25,
        ).values_list("row_payload_json", flat=True)
        for payload in sample_rows:
            payload_dict = payload or {}
            field_names.update(str(key) for key in payload_dict.keys())

    mappings = {
        item.raw_column: item
        for item in column_mapping.objects.select_related("unit_type").filter(
            source_system__iexact=source_system,
            dataset_key__iexact=dataset_key,
        )
    }

    rows: list[ColumnMappingFieldRow] = []
    for raw_col in sorted(field_names):
        m = mappings.get(raw_col)
        rows.append(
            ColumnMappingFieldRow(
                raw_column=raw_col,
                column_mapping_id=m.column_mapping_id if m else None,
                is_mapped=m is not None,
                semantic_key=m.semantic_key if m else "",
                unit_type_id=m.unit_type_id if m else None,
                unit_type_name=str(m.unit_type) if m and m.unit_type_id else None,
                column_label=m.column_label if m else "",
                notes=m.notes if m else "",
                include_in_ingestion=m.include_in_ingestion if m else True,
                inferred_role=_infer_role(m) if m else "unmapped",
                suggested_semantic_key=_suggest_semantic_key(raw_col),
            )
        )
    return rows


# ---------------------------------------------------------------------------
# Ninja schemas
# ---------------------------------------------------------------------------

class UnitTypeOut(Schema):
    unit_type_id: int
    unit_name: str
    base_data_type: str
    description: str


class UnitTypeIn(Schema):
    unit_name: str
    base_data_type: str = "float"
    description: str = ""


class ColumnMappingOut(Schema):
    column_mapping_id: int
    source_system: str
    dataset_key: str
    raw_column: str
    semantic_key: str
    unit_type_id: Optional[int]
    unit_type_name: Optional[str] = None
    column_label: str
    notes: str
    include_in_ingestion: bool
    inferred_role: str

    @staticmethod
    def resolve_unit_type_name(obj) -> Optional[str]:
        return str(obj.unit_type) if obj.unit_type_id else None

    @staticmethod
    def resolve_inferred_role(obj) -> str:
        return _infer_role(obj)


class ColumnMappingIn(Schema):
    source_system: str
    dataset_key: str
    raw_column: str
    semantic_key: str = ""
    unit_type_id: Optional[int] = None
    column_label: str = ""
    notes: str = ""
    include_in_ingestion: bool = True


class SourceMappingSummaryOut(Schema):
    source_system: str
    dataset_key: str
    file_count: int
    raw_field_count: int
    mapped_field_count: int
    unmapped_field_count: int
    sample_unmapped_fields: list[str]


class ColumnMappingFieldOut(Schema):
    raw_column: str
    column_mapping_id: Optional[int]
    is_mapped: bool
    semantic_key: str
    unit_type_id: Optional[int]
    unit_type_name: Optional[str]
    column_label: str
    notes: str
    include_in_ingestion: bool
    inferred_role: str
    suggested_semantic_key: str


class SourceMappingSampleRowOut(Schema):
    source_file_name: str
    row_number: int
    row_payload_json: dict


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

schema_api = NinjaAPI(urls_namespace="schema_api", docs_url="/docs")


# ---- Unit Type endpoints ----

@schema_api.get("unit-types/", response=list[UnitTypeOut])
def list_unit_types(request):
    return unit_type.objects.all().order_by("unit_name")


@schema_api.get("unit-types/{unit_type_id}/", response=UnitTypeOut)
def get_unit_type(request, unit_type_id: int):
    return get_object_or_404(unit_type, pk=unit_type_id)


@schema_api.post("unit-types/", response=UnitTypeOut)
def create_unit_type(request, payload: UnitTypeIn):
    return unit_type.objects.create(**payload.dict())


@schema_api.patch("unit-types/{unit_type_id}/", response=UnitTypeOut)
def update_unit_type(request, unit_type_id: int, payload: UnitTypeIn):
    obj = get_object_or_404(unit_type, pk=unit_type_id)
    for attr, value in payload.dict().items():
        setattr(obj, attr, value)
    obj.save()
    return obj


@schema_api.delete("unit-types/{unit_type_id}/")
def delete_unit_type(request, unit_type_id: int):
    obj = get_object_or_404(unit_type, pk=unit_type_id)
    obj.delete()
    return {"ok": True}


# ---- Column Mapping CRUD ----

@schema_api.get("column-mappings/", response=list[ColumnMappingOut])
@paginate(PageNumberPagination, page_size=200)
def list_column_mappings(
    request,
    source_system: Optional[str] = Query(default=None),
    dataset_key: Optional[str] = Query(default=None),
):
    qs = column_mapping.objects.select_related("unit_type").order_by(
        "source_system", "dataset_key", "raw_column"
    )
    if source_system:
        qs = qs.filter(source_system__iexact=source_system)
    if dataset_key:
        qs = qs.filter(dataset_key__iexact=dataset_key)
    return qs


@schema_api.get("column-mappings/{mapping_id}/", response=ColumnMappingOut)
def get_column_mapping(request, mapping_id: int):
    return get_object_or_404(column_mapping.objects.select_related("unit_type"), pk=mapping_id)


@schema_api.post("column-mappings/", response=ColumnMappingOut)
def create_column_mapping(request, payload: ColumnMappingIn):
    data = payload.dict()
    unit_type_id = data.pop("unit_type_id", None)
    obj = column_mapping.objects.create(**data, unit_type_id=unit_type_id)
    return column_mapping.objects.select_related("unit_type").get(pk=obj.pk)


@schema_api.patch("column-mappings/{mapping_id}/", response=ColumnMappingOut)
def update_column_mapping(request, mapping_id: int, payload: ColumnMappingIn):
    obj = get_object_or_404(column_mapping, pk=mapping_id)
    data = payload.dict()
    unit_type_id = data.pop("unit_type_id", None)
    for attr, value in data.items():
        setattr(obj, attr, value)
    obj.unit_type_id = unit_type_id
    obj.save()
    return column_mapping.objects.select_related("unit_type").get(pk=obj.pk)


@schema_api.delete("column-mappings/{mapping_id}/")
def delete_column_mapping(request, mapping_id: int):
    obj = get_object_or_404(column_mapping, pk=mapping_id)
    obj.delete()
    return {"ok": True}


# ---- Source mapping views ----

@schema_api.get("source-mappings/", response=list[SourceMappingSummaryOut])
def list_source_mappings(request, source_system: Optional[str] = Query(default=None)):
    summaries = _collect_source_mapping_summaries()
    if source_system:
        summaries = [s for s in summaries if source_system.lower() in s.source_system.lower()]
    return summaries


@schema_api.get("source-mappings/detail/", response=list[ColumnMappingFieldOut])
def get_source_mapping_detail(
    request,
    source_system: str = Query(...),
    dataset_key: str = Query(...),
):
    return _collect_column_mapping_fields(source_system, dataset_key)


@schema_api.get("source-mappings/sample-rows/", response=list[SourceMappingSampleRowOut])
def get_source_mapping_sample_rows(
    request,
    source_system: str = Query(...),
    dataset_key: str = Query(...),
    limit: int = Query(default=20),
):
    safe_limit = max(1, min(limit, 200))

    files = list(
        source_file.objects.filter(source_system__iexact=source_system)
        .only("source_file_id", "source_system", "source_file_name")
        .prefetch_related("nyiso_reports__nyiso_report")
        .order_by("source_file_id")
    )
    matching_file_ids = [
        src.source_file_id
        for src in files
        if _resolve_dataset_key(src).lower() == dataset_key.lower()
    ]

    if not matching_file_ids:
        return []

    raw_rows = raw_record.objects.filter(source_file_id__in=matching_file_ids).select_related("source_file").order_by("source_file_id", "row_number")[:safe_limit]

    return [
        SourceMappingSampleRowOut(
            source_file_name=row.source_file.source_file_name,
            row_number=row.row_number,
            row_payload_json=row.row_payload_json or {},
        )
        for row in raw_rows
    ]


class SourceMappingTestRunOut(Schema):
    success: bool
    message: str
    files_tested: int
    raw_records_processed: int
    timeseries_points_would_create: int
    validation_warnings: list[str]
    error_detail: Optional[str] = None


class SourceMappingRunOut(Schema):
    success: bool
    message: str
    files_ran: int
    attempted_points: int
    inserted_points: int
    duplicate_points_skipped: int
    output: str
    error_detail: Optional[str] = None


def _test_run_source_mapping(source_system: str, dataset_key: str) -> SourceMappingTestRunOut:
    """Test a source mapping by simulating normalization across all matching files."""
    from decimal import Decimal, InvalidOperation
    
    # Find source files for this source_system/dataset_key
    files = list(
        source_file.objects.filter(source_system__iexact=source_system)
        .only("source_file_id", "source_file_name", "source_system")
        .prefetch_related("nyiso_reports__nyiso_report")
    )
    
    matching_files = [
        src for src in files
        if _resolve_dataset_key(src).lower() == dataset_key.lower()
    ]
    
    if not matching_files:
        return SourceMappingTestRunOut(
            success=False,
            message="No source files found for this source_system/dataset_key combination.",
            files_tested=0,
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=[],
            error_detail="No matching files found",
        )
    
    warnings: list[str] = []
    
    # Get all column_mappings for this dataset
    all_mappings = list(
        column_mapping.objects
        .filter(
            source_system__iexact=source_system,
            dataset_key__iexact=dataset_key,
            include_in_ingestion=True,
        )
        .select_related("unit_type")
    )
    
    if not all_mappings:
        return SourceMappingTestRunOut(
            success=False,
            message=f"No column mappings found for {source_system}/{dataset_key}.",
            files_tested=0,
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=["No column mappings configured"],
            error_detail="Missing column mappings",
        )
    
    # Categorize mappings by role
    def _get_role(cm):
        if cm.unit_type_id and cm.unit_type and cm.unit_type.base_data_type == "datetime":
            return "timestamp"
        if cm.unit_type_id:
            return "value"
        if cm.column_label:
            return "dimension"
        return "unmapped"
    
    ts_mappings = [m for m in all_mappings if _get_role(m) == "timestamp"]
    value_mappings = [m for m in all_mappings if _get_role(m) == "value"]
    dim_mappings = [m for m in all_mappings if _get_role(m) == "dimension"]
    unmapped_mappings = [m for m in all_mappings if _get_role(m) == "unmapped"]
    
    if len(ts_mappings) != 1:
        warnings.append("Expected exactly one timestamp column configured")
        return SourceMappingTestRunOut(
            success=False,
            message="Invalid timestamp mapping configuration.",
            files_tested=len(matching_files),
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=warnings,
            error_detail=f"Found {len(ts_mappings)} timestamp mappings",
        )
    ts_mapping = ts_mappings[0]
    
    if not value_mappings:
        warnings.append("No value columns configured - nothing to normalize")
        return SourceMappingTestRunOut(
            success=False,
            message="No value column mappings found.",
            files_tested=len(matching_files),
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=warnings,
            error_detail="No value mappings",
        )
    
    if len(dim_mappings) != 1:
        warnings.append("Expected exactly one dimension column configured")
        return SourceMappingTestRunOut(
            success=False,
            message="Invalid dimension mapping configuration.",
            files_tested=len(matching_files),
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=warnings,
            error_detail=f"Found {len(dim_mappings)} dimension mappings",
        )

    if unmapped_mappings:
        warnings.append(f"{len(unmapped_mappings)} active columns are unmapped and will be ignored")
    
    # Simulate normalization
    points_to_create: set[tuple[int, str]] = set()
    raw_record_count = 0
    ts_field = ts_mapping.raw_column
    dim_field = dim_mappings[0].raw_column
    for src in matching_files:
        for rr in src.raw_records.all():
            raw_record_count += 1
            payload = rr.row_payload_json or {}

            ts_val = payload.get(ts_field)
            if not ts_val or str(ts_val).strip() == "":
                return SourceMappingTestRunOut(
                    success=False,
                    message="Invalid source data encountered.",
                    files_tested=len(matching_files),
                    raw_records_processed=raw_record_count,
                    timeseries_points_would_create=len(points_to_create),
                    validation_warnings=warnings,
                    error_detail=f"row {rr.row_number}: missing timestamp value",
                )

            dim_val = payload.get(dim_field)
            if dim_val is None or str(dim_val).strip() == "":
                return SourceMappingTestRunOut(
                    success=False,
                    message="Invalid source data encountered.",
                    files_tested=len(matching_files),
                    raw_records_processed=raw_record_count,
                    timeseries_points_would_create=len(points_to_create),
                    validation_warnings=warnings,
                    error_detail=f"row {rr.row_number}: missing dimension value",
                )

            ts_key = str(ts_val).strip()

            for value_m in value_mappings:
                raw_val = payload.get(value_m.raw_column)
                if raw_val is None or str(raw_val).strip() == "":
                    continue
                try:
                    Decimal(str(raw_val).replace(",", "").strip())
                    points_to_create.add((value_m.column_mapping_id, ts_key))
                except InvalidOperation:
                    return SourceMappingTestRunOut(
                        success=False,
                        message="Invalid source data encountered.",
                        files_tested=len(matching_files),
                        raw_records_processed=raw_record_count,
                        timeseries_points_would_create=len(points_to_create),
                        validation_warnings=warnings,
                        error_detail=(
                            f"row {rr.row_number}: invalid numeric value '{raw_val}' "
                            f"in column '{value_m.raw_column}'"
                        ),
                    )
    
    return SourceMappingTestRunOut(
        success=True,
        message=f"Test passed across {len(matching_files)} files: {len(points_to_create)} points would be created from {raw_record_count} records.",
        files_tested=len(matching_files),
        raw_records_processed=raw_record_count,
        timeseries_points_would_create=len(points_to_create),
        validation_warnings=warnings,
        error_detail=None,
    )


def _run_source_mapping(source_system: str, dataset_key: str) -> SourceMappingRunOut:
    """Run normalization for all matching source files and return aggregate output."""
    from energy_hub.server.nyiso_ingestor import normalize_nyiso_source_file
    import re

    files = list(
        source_file.objects.filter(source_system__iexact=source_system)
        .only("source_file_id", "source_file_name", "source_system")
        .prefetch_related("nyiso_reports__nyiso_report")
    )

    matching_files = [
        src for src in files
        if _resolve_dataset_key(src).lower() == dataset_key.lower()
    ]

    if not matching_files:
        return SourceMappingRunOut(
            success=False,
            message="No source files found for this source_system/dataset_key combination.",
            files_ran=0,
            attempted_points=0,
            inserted_points=0,
            duplicate_points_skipped=0,
            output="",
            error_detail="No matching files found",
        )

    output_lines: list[str] = []
    attempted_total = 0
    inserted_total = 0
    duplicate_total = 0
    failed = False

    for src in matching_files:
        try:
            task_result = normalize_nyiso_source_file(src.source_file_id)
            output_text = str(task_result)
            output_lines.append(output_text)

            match_attempted = re.search(r"attempted=(\d+)", output_text)
            match_inserted = re.search(r"inserted=(\d+)", output_text)
            match_duplicates = re.search(r"duplicates=(\d+)", output_text)
            if match_attempted:
                attempted_total += int(match_attempted.group(1))
            if match_inserted:
                inserted_total += int(match_inserted.group(1))
            if match_duplicates:
                duplicate_total += int(match_duplicates.group(1))

            if not output_text.startswith("ok:"):
                failed = True
        except Exception as exc:
            failed = True
            output_lines.append(f"failed: file={src.source_file_name} error={exc}")

    return SourceMappingRunOut(
        success=not failed,
        message=(
            f"Mapping run completed across {len(matching_files)} files. "
            f"attempted={attempted_total} inserted={inserted_total} duplicates_skipped={duplicate_total}"
        ) if not failed else "Mapping run completed with one or more failures.",
        files_ran=len(matching_files),
        attempted_points=attempted_total,
        inserted_points=inserted_total,
        duplicate_points_skipped=duplicate_total,
        output="\n".join(output_lines),
        error_detail=None if not failed else "See output for per-file failures.",
    )


@schema_api.post("source-mappings/test-run/", response=SourceMappingTestRunOut)
def test_source_mapping(
    request,
    source_system: str = Query(...),
    dataset_key: str = Query(...),
):
    """Test a source mapping by running a dry-run normalization on sample data."""
    return _test_run_source_mapping(source_system, dataset_key)


@schema_api.post("source-mappings/run/", response=SourceMappingRunOut)
def run_source_mapping(
    request,
    source_system: str = Query(...),
    dataset_key: str = Query(...),
):
    """Run source mapping normalization and return command output."""
    return _run_source_mapping(source_system, dataset_key)



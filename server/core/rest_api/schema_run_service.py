"""
Source mapping run/test service layer.
Extracted from schema_api.py to keep the API router thin.
"""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from core.models import column_mapping
from .source_mapping_service import matching_source_files


def _get_column_role(cm: column_mapping) -> str:
    if cm.unit_type_id and cm.unit_type and cm.unit_type.base_data_type == "datetime":
        return "timestamp"
    if cm.unit_type_id:
        return "value"
    if cm.column_label:
        return "dimension"
    return "unmapped"


def test_run_source_mapping(source_system: str, dataset_key: str) -> dict:
    """
    Dry-run normalization across all matching source files.
    Returns a dict matching SourceMappingTestRunOut schema.
    """
    matching_files = matching_source_files(source_system, dataset_key)

    if not matching_files:
        return dict(
            success=False,
            message="No source files found for this source_system/dataset_key combination.",
            files_tested=0,
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=[],
            error_detail="No matching files found",
        )

    warnings: list[str] = []

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
        return dict(
            success=False,
            message=f"No column mappings found for {source_system}/{dataset_key}.",
            files_tested=0,
            raw_records_processed=0,
            timeseries_points_would_create=0,
            validation_warnings=["No column mappings configured"],
            error_detail="Missing column mappings",
        )

    ts_mappings = [m for m in all_mappings if _get_column_role(m) == "timestamp"]
    value_mappings = [m for m in all_mappings if _get_column_role(m) == "value"]
    dim_mappings = [m for m in all_mappings if _get_column_role(m) == "dimension"]
    unmapped_mappings = [m for m in all_mappings if _get_column_role(m) == "unmapped"]

    if len(ts_mappings) != 1:
        warnings.append("Expected exactly one timestamp column configured")
        return dict(
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
        return dict(
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
        return dict(
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
                return dict(
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
                return dict(
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
                    return dict(
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

    return dict(
        success=True,
        message=(
            f"Test passed across {len(matching_files)} files: "
            f"{len(points_to_create)} points would be created from {raw_record_count} records."
        ),
        files_tested=len(matching_files),
        raw_records_processed=raw_record_count,
        timeseries_points_would_create=len(points_to_create),
        validation_warnings=warnings,
        error_detail=None,
    )


def run_source_mapping(source_system: str, dataset_key: str) -> dict:
    """
    Run normalization for all matching source files and return aggregate output.
    Returns a dict matching SourceMappingRunOut schema.
    """
    from energy_hub.server.nyiso_ingestor import normalize_nyiso_source_file

    matching_files = matching_source_files(source_system, dataset_key)

    if not matching_files:
        return dict(
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

    return dict(
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

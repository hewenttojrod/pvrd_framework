from core.models import source_file


def resolve_dataset_key(src: source_file) -> str:
    if src.source_system.lower() == "nyiso":
        prefetched = getattr(src, "_prefetched_objects_cache", {}).get("nyiso_reports")
        if prefetched is not None:
            report_link = prefetched[0] if prefetched else None
        else:
            report_link = src.nyiso_reports.select_related("nyiso_report").first()

        if report_link and report_link.nyiso_report:
            return report_link.nyiso_report.code
    return src.source_file_name


def load_source_files_for_system(source_system: str) -> list[source_file]:
    return list(
        source_file.objects.filter(source_system__iexact=source_system)
        .only("source_file_id", "source_file_name", "source_system")
        .prefetch_related("nyiso_reports__nyiso_report")
        .order_by("source_file_id")
    )


def matching_source_file_ids(source_system: str, dataset_key: str) -> list[int]:
    files = load_source_files_for_system(source_system)
    target_dataset = dataset_key.lower()
    return [
        src.source_file_id
        for src in files
        if resolve_dataset_key(src).lower() == target_dataset
    ]


def matching_source_files(source_system: str, dataset_key: str) -> list[source_file]:
    files = load_source_files_for_system(source_system)
    target_dataset = dataset_key.lower()
    return [src for src in files if resolve_dataset_key(src).lower() == target_dataset]
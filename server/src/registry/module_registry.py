"""Load module registrations from each module's base-level registry file."""

from importlib import import_module
from pathlib import Path
import os

from .module_registration import ModuleRegistration


MODULES_ROOT = os.getenv("MODULES_ROOT")
MODULES_DIR = Path(MODULES_ROOT) if MODULES_ROOT else None
REGISTRY_PATTERN = "server.registry"


def _discover_module_names() -> list[str]:
    if MODULES_DIR is None or not MODULES_DIR.exists():
        return []

    module_names: list[str] = []
    for child in MODULES_DIR.iterdir():
        if not child.is_dir() or child.name.startswith("_"):
            continue
        if not (child / "__init__.py").exists():
            continue
        module_names.append(child.name)
    return sorted(module_names, key=str.lower)


def _load_module_registration(module_name: str) -> ModuleRegistration | None:
    try:
        registry_module = import_module(f"{module_name}.{REGISTRY_PATTERN}")
    except ModuleNotFoundError as exc:
        # Ignore modules that do not define a module registry file.
        if exc.name == f"{module_name}.{REGISTRY_PATTERN}":
            return None
        raise

    registration = getattr(registry_module, "MODULE_REGISTRATION", None)
    if not isinstance(registration, ModuleRegistration):
        raise ValueError(
            f"{module_name}.{REGISTRY_PATTERN} must define ModuleRegistration MODULE_REGISTRATION"
        )

    return registration


def _build_registered_modules() -> list[ModuleRegistration]:
    registrations: list[ModuleRegistration] = []
    for module_name in _discover_module_names():
        registration = _load_module_registration(module_name)
        if registration is not None:
            registrations.append(registration)
    return registrations


REGISTERED_MODULES = _build_registered_modules()

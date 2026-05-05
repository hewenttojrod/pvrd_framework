from dataclasses import dataclass


@dataclass(frozen=True)
class ModuleRegistration:
    name: str
    app_config: str
    urls: str | None = None
    api_router: str | None = None
    schedule_task: str | None = None
    schedule_interval_seconds: float = 60.0

    def app_config_path(self) -> str:
        return f"{self.name}.{self.app_config}"

    def urls_path(self) -> str | None:
        if self.urls is None:
            return None
        return f"{self.name}.{self.urls}"

    def api_router_path(self) -> str | None:
        if self.api_router is None:
            return None
        return f"{self.name}.{self.api_router}"

    def schedule_task_path(self) -> str | None:
        if self.schedule_task is None:
            return None
        return f"{self.name}.{self.schedule_task}"

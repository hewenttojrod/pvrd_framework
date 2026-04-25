"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from importlib import import_module

from django.contrib import admin
from django.urls import include, path

from src.registry.module_registry import REGISTERED_MODULES

urlpatterns = [
    path("admin/", admin.site.urls),
]

for module in REGISTERED_MODULES:
    module_urls = module.urls_path()
    if module_urls:
        try:
            import_module(module_urls)
            urlpatterns.append(path(f"{module.name.lower()}/", include(module_urls)))
        except ModuleNotFoundError:
            pass

    api_urls = module.api_router_path()
    if api_urls:
        try:
            import_module(api_urls)
            urlpatterns.append(path(f"api/{module.name.lower()}/", include(api_urls)))
        except ModuleNotFoundError:
            pass

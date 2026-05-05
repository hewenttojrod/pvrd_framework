from django.urls import path

from .celery_api import core_api
from .schema_api import schema_api
from .chart_api import chart_api


urlpatterns = [
    path("", core_api.urls),
    path("schema/", schema_api.urls),
    path("charts/", chart_api.urls),
]

from django.urls import path

from .celery_api import core_api


urlpatterns = [
    path("", core_api.urls),
]

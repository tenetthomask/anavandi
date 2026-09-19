from django.urls import path
from .views import check_config, extract_data, extract_demo

urlpatterns = [
    path('config',       check_config),   # GET  /api/config
    path('extract',      extract_data),   # POST /api/extract   (real Vision AI)
    path('extract-demo', extract_demo),   # POST /api/extract-demo (built-in sample)
]

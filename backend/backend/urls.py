# backend/backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Removemos as importações do TokenObtainPairView porque não usamos mais aqui

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # REMOVIDO: path('api/token/', ...) - Isso causava o conflito
    # REMOVIDO: path('api/token/refresh/', ...) - Isso causava o conflito
    
    # Inclui todas as rotas da API (onde está o login customizado e o refresh)
    path('api/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

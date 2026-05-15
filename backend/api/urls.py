# backend/api/urls.py
from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
    
    # NOVA ROTA: Usa nossa função manual que aceita 'email'
    path('token/', views.custom_token_obtain, name='token_obtain_pair'),
    
    # Mantemos o refresh padrão pois ele só precisa do token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
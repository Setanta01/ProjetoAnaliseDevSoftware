# backend/api/urls.py
from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
    path('token/', views.custom_token_obtain, name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
 
    # Projetos
    path('projetos/', views.projetos_list, name='projetos_list'),
    path('projetos/<int:pk>/', views.projeto_detail, name='projeto_detail'),
 
    # Sprints
    path('sprints/', views.sprints_list, name='sprints_list'),
 
    # Tasks
    path('tasks/', views.tasks_list, name='tasks_list'),
    path('tasks/minhas/', views.tasks_minhas, name='tasks_minhas'),
    path('tasks/<int:pk>/', views.task_detail, name='task_detail'),
 
    # Admin
    path('admin/stats/', views.admin_stats, name='admin_stats'),
    path('admin/usuarios/', views.admin_usuarios, name='admin_usuarios'),
]
# backend/api/urls.py
from django.urls import path
from . import views
from .views_mfa import (
    google_login,
    mfa_status,
    mfa_setup_totp,
    mfa_verify_totp,
    mfa_setup_email,
    mfa_verify_email,
    mfa_challenge,
    mfa_resend_email,
    mfa_disable,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('register/',       views.register,             name='register'),
    path('profile/',        views.profile,              name='profile'),
    path('token/',          views.custom_token_obtain,  name='token_obtain'),
    path('token/refresh/',  TokenRefreshView.as_view(), name='token_refresh'),

    # ── Google OAuth ──────────────────────────────────────────────────────────
    path('auth/google/',    google_login,               name='google_login'),

    # ── MFA ───────────────────────────────────────────────────────────────────
    path('mfa/status/',         mfa_status,         name='mfa_status'),
    path('mfa/challenge/',      mfa_challenge,      name='mfa_challenge'),
    path('mfa/resend-email/',   mfa_resend_email,   name='mfa_resend_email'),
    path('mfa/disable/',        mfa_disable,        name='mfa_disable'),
    # TOTP
    path('mfa/setup/totp/',     mfa_setup_totp,     name='mfa_setup_totp'),
    path('mfa/verify/totp/',    mfa_verify_totp,    name='mfa_verify_totp'),
    # Email OTP
    path('mfa/setup/email/',    mfa_setup_email,    name='mfa_setup_email'),
    path('mfa/verify/email/',   mfa_verify_email,   name='mfa_verify_email'),

    # ── Projetos ──────────────────────────────────────────────────────────────
    path('projetos/',           views.projetos_list,    name='projetos_list'),
    path('projetos/<int:pk>/',  views.projeto_detail,   name='projeto_detail'),

    # ── Sprints ───────────────────────────────────────────────────────────────
    path('sprints/',            views.sprints_list,     name='sprints_list'),

    # ── Tasks ─────────────────────────────────────────────────────────────────
    path('tasks/',              views.tasks_list,       name='tasks_list'),
    path('tasks/minhas/',       views.tasks_minhas,     name='tasks_minhas'),
    path('tasks/<int:pk>/',     views.task_detail,      name='task_detail'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/stats/',        views.admin_stats,      name='admin_stats'),
    path('admin/usuarios/',     views.admin_usuarios,   name='admin_usuarios'),
]
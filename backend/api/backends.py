# backend/api/backends.py
from django.contrib.auth.backends import BaseBackend
from .models import Usuario

class EmailBackend(BaseBackend):
    def authenticate(self, request, email=None, password=None, **kwargs):
        try:
            # 1. Busca pelo email (unique key no seu SQL)
            user = Usuario.objects.get(email=email)
            
            # 2. Verifica se está ativo e se a senha bate (usando o método do model)
            if user.check_password(password) and user.ativo:
                return user
        except Usuario.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return Usuario.objects.get(pk=user_id)
        except Usuario.DoesNotExist:
            return None
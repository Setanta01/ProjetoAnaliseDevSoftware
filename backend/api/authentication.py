# backend/api/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Usuario

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            # Pega o ID do usuário que está dentro do token
            user_id = validated_token['user_id']
        except KeyError:
            return None

        try:
            # FORÇA a busca direta na tabela usuarios pelo ID
            # Ignora o UserManager padrão que pode estar falhando
            user = Usuario.objects.get(id=user_id)
        except Usuario.DoesNotExist:
            return None

        # Verifica se o usuário está ativo (regra de negócio)
        if not user.ativo:
            return None

        return user
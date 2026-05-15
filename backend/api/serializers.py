# backend/api/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

# Importa o modelo Usuario que você criou
Usuario = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Indica ao validador que o campo de identificação é 'email'
    username_field = 'email'

    def validate(self, attrs):
        # Mapeia o email recebido para o formato que o JWT espera internamente
        data = {}
        data['email'] = attrs.get('email')
        data['password'] = attrs.get('password')
        
        # Chama a validação padrão, mas agora o backend vai tratar 'email' como user
        return super().validate(data)
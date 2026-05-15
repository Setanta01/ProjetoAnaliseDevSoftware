
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate  # <--- IMPORTANTE: Adicionei esta linha
from rest_framework_simplejwt.tokens import RefreshToken # <--- IMPORTANTE: Adicionei esta linha

# IMPORTA SEUS MODELOS
from .models import Usuario, Cargo

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    # Pega os dados do request
    email = request.data.get('email')
    password = request.data.get('password')
    nome = request.data.get('nome') # Seu front envia 'username', mas a tabela é 'nome'
    cargo_nome = request.data.get('cargo', 'DEV').upper()

    # Validação básica
    if not email or not password:
        return Response(
            {'error': 'Email e senha são obrigatórios.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verifica duplicidade no campo email da tabela usuarios
    if Usuario.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email já cadastrado.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Busca o cargo na tabela cargos
    try:
        cargo_obj = Cargo.objects.get(nome=cargo_nome)
    except Cargo.DoesNotExist:
        return Response({'error': 'Cargo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Cria o objeto na tabela usuarios
        user = Usuario(
            nome=nome or email.split('@')[0], # Fallback para nome se não enviado
            email=email,
            cargo=cargo_obj,
            ativo=True
        )
        
        # Criptografa a senha usando o método do model
        user.set_password(password)
        user.save()
        
        return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    # request.user agora é uma instância do seu modelo Usuario
    user = request.user 
    
    return Response({
        'id': user.id,
        'username': user.nome,       # Mapeia 'nome' do SQL para 'username' do Front
        'email': user.email,
        'cargo': user.cargo.nome,    # Pega o nome do cargo (ex: 'ADMIN')
    })


# --- FUNÇÃO DE LOGIN MANUAL ADICIONADA ---
@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_obtain(request):
    
    """
    View manual de login que aceita 'email' em vez de 'username'.
    """
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'detail': 'Email e senha são obrigatórios.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Tenta autenticar usando nosso EmailBackend (configurado no settings.py)
    user = authenticate(request, email=email, password=password)

    if user is not None:
        # Se autenticou, gera os tokens manualmente
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    else:
        return Response(
            {'detail': 'Credenciais inválidas.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
# backend/api/views_mfa.py


import requests as http_requests

from django.conf import settings
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Usuario, ConviteSistema
from .mfa_utils import (
    gerar_mfa_token,
    verificar_mfa_token,
    enviar_otp_email,
    gerar_qrcode_base64,
    # FIX (#9): helpers de token agora vivem em mfa_utils (fonte única),
    # importados aqui e também em views.py — sem duplicação nem import circular.
    _emitir_tokens,
    _resposta_mfa_pendente,
)


# ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Recebe o id_token emitido pelo Google no frontend,
    valida com a API do Google e autentica / cria o usuário.

    Body: { "id_token": "<token do Google>" }

    Criação de usuário exige convite prévio válido (sistema fechado).
    """
    id_token = request.data.get('id_token')
    if not id_token:
        return Response({'error': 'id_token é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── 1. Valida o token com o Google ────────────────────────────────────────
    try:
        resp = http_requests.get(
            GOOGLE_TOKENINFO_URL,
            params={'id_token': id_token},
            timeout=5,
        )
        info = resp.json()
    except Exception:
        return Response({'error': 'Falha ao contatar o Google.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if resp.status_code != 200 or 'error' in info:
        return Response({'error': 'Token do Google inválido.'}, status=status.HTTP_401_UNAUTHORIZED)

    # ── 2. Verifica o audience (client_id da sua aplicação) ───────────────────
    google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    if google_client_id and info.get('aud') != google_client_id:
        return Response({'error': 'Token não pertence a esta aplicação.'}, status=status.HTTP_401_UNAUTHORIZED)

    google_id = info.get('sub')          # ID único do Google
    email     = info.get('email', '')
    nome      = info.get('name', email.split('@')[0])

    if not google_id or not email:
        return Response({'error': 'Dados insuficientes retornados pelo Google.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── 3. Acha ou cria o usuário ─────────────────────────────────────────────
    user = None

    # Tenta achar pelo google_id primeiro (login recorrente)
    try:
        user = Usuario.objects.get(google_id=google_id)
    except Usuario.DoesNotExist:
        pass

    # Tenta achar pelo email (usuário pode já existir com senha)
    if user is None:
        try:
            user = Usuario.objects.get(email=email)
            user.google_id = google_id
            user.save(update_fields=['google_id'])
        except Usuario.DoesNotExist:
            pass

    # Criação de novo usuário exige convite válido
    if user is None:
        try:
            convite = ConviteSistema.objects.get(email=email, usado=False)
        except ConviteSistema.DoesNotExist:
            return Response(
                {'error': 'Nenhum convite válido encontrado para este e-mail.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if convite.expira_em and convite.expira_em < timezone.now():
            return Response({'error': 'Convite expirado.'}, status=status.HTTP_403_FORBIDDEN)

        user = Usuario.objects.create(
            nome=nome,
            email=email,
            google_id=google_id,
            admin=convite.admin,
            ativo=True,
        )
        convite.usado = True
        convite.save(update_fields=['usado'])

    if not user.ativo:
        return Response({'error': 'Usuário inativo.'}, status=status.HTTP_403_FORBIDDEN)

    # ── 4. MFA ativo → emite mfa_token em vez dos tokens definitivos ──────────
    if user.mfa_ativo and user.mfa_tipo == 'EMAIL':
        try:
            enviar_otp_email(user)
        except Exception:
            return Response({'error': 'Falha ao enviar código MFA por e-mail.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return _resposta_mfa_pendente(user)

    if user.mfa_ativo and user.mfa_tipo == 'TOTP':
        return _resposta_mfa_pendente(user)

    # ── 5. Sem MFA → tokens definitivos ──────────────────────────────────────
    return Response(_emitir_tokens(user), status=status.HTTP_200_OK)


# ─── MFA STATUS ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_status(request):
    """
    Retorna o status atual do MFA do usuário logado.
    GET /api/mfa/status/
    """
    user = request.user
    return Response({
        'mfa_ativo': user.mfa_ativo,
        'mfa_tipo':  user.mfa_tipo,
    })


# ─── SETUP TOTP ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_setup_totp(request):
    """
    Inicia o setup do TOTP: gera secret e retorna QR code base64.
    O MFA ainda NÃO é ativado — só ativa após /mfa/verify/totp/.

    POST /api/mfa/setup/totp/
    """
    user = request.user

    user.gerar_totp_secret()

    uri = user.get_totp_uri(issuer='Lazuli')
    qr_base64 = gerar_qrcode_base64(uri)

    return Response({
        'secret': user.totp_secret,
        'qrcode': qr_base64,
        'uri':    uri,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify_totp(request):
    """
    Confirma o código TOTP e ativa o MFA no modo TOTP.
    Body: { "code": "123456" }

    POST /api/mfa/verify/totp/
    """
    user = request.user
    code = request.data.get('code', '').strip()

    if not code:
        return Response({'error': 'Código obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.totp_secret:
        return Response({'error': 'Inicie o setup TOTP primeiro.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.verificar_totp(code):
        return Response({'error': 'Código inválido ou expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    user.mfa_ativo = True
    user.mfa_tipo  = 'TOTP'
    user.save(update_fields=['mfa_ativo', 'mfa_tipo'])

    return Response({'message': 'MFA via Authenticator ativado com sucesso!'})


# ─── SETUP EMAIL OTP ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_setup_email(request):
    """
    Envia um OTP para o e-mail do usuário para confirmar o setup.
    POST /api/mfa/setup/email/
    """
    user = request.user

    try:
        enviar_otp_email(user)
    except Exception as e:
        return Response({'error': f'Falha ao enviar e-mail: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': f'Código enviado para {user.email}. Válido por 10 minutos.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify_email(request):
    """
    Confirma o OTP de e-mail e ativa o MFA no modo EMAIL.
    Body: { "code": "123456" }

    POST /api/mfa/verify/email/
    """
    user = request.user
    code = request.data.get('code', '').strip()

    if not code:
        return Response({'error': 'Código obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.verificar_otp_email(code):
        return Response({'error': 'Código inválido ou expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    user.mfa_ativo = True
    user.mfa_tipo  = 'EMAIL'
    user.save(update_fields=['mfa_ativo', 'mfa_tipo'])

    return Response({'message': 'MFA via e-mail ativado com sucesso!'})


# ─── CHALLENGE (segundo fator durante o login) ────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_challenge(request):
    """
    Valida o segundo fator e emite os tokens definitivos.
    Body: { "mfa_token": "...", "code": "123456" }

    POST /api/mfa/challenge/
    """
    mfa_token = request.data.get('mfa_token', '').strip()
    code      = request.data.get('code', '').strip()

    if not mfa_token or not code:
        return Response({'error': 'mfa_token e code são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    user_id = verificar_mfa_token(mfa_token)
    if user_id is None:
        return Response({'error': 'mfa_token inválido ou expirado. Faça login novamente.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = Usuario.objects.get(id=user_id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if not user.ativo:
        return Response({'error': 'Usuário inativo.'}, status=status.HTTP_403_FORBIDDEN)

    if user.mfa_tipo == 'TOTP':
        valido = user.verificar_totp(code)
    elif user.mfa_tipo == 'EMAIL':
        valido = user.verificar_otp_email(code)
    else:
        return Response({'error': 'Tipo de MFA desconhecido.'}, status=status.HTTP_400_BAD_REQUEST)

    if not valido:
        return Response({'error': 'Código inválido ou expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response(_emitir_tokens(user), status=status.HTTP_200_OK)


# ─── REENVIO DE OTP (para o challenge de email) ───────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_resend_email(request):
    """
    Reenvia o OTP por e-mail durante o challenge de login.
    Body: { "mfa_token": "..." }

    POST /api/mfa/resend-email/
    """
    mfa_token = request.data.get('mfa_token', '').strip()
    if not mfa_token:
        return Response({'error': 'mfa_token obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    user_id = verificar_mfa_token(mfa_token)
    if user_id is None:
        return Response({'error': 'mfa_token inválido ou expirado.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = Usuario.objects.get(id=user_id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        enviar_otp_email(user)
    except Exception as e:
        return Response({'error': f'Falha ao enviar e-mail: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'Novo código enviado.'})


# ─── DESATIVAR MFA ────────────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def mfa_disable(request):
    """
    Desativa o MFA do usuário logado.
    Exige confirmação de senha para usuários com senha cadastrada.
    Body: { "password": "senha_atual" }

    DELETE /api/mfa/disable/
    """
    user = request.user

    # Usuários que só têm Google (sem senha_hash) podem desativar sem confirmação
    if user.senha_hash:
        password = request.data.get('password')
        if password is None:
            return Response(
                {'error': 'O campo "password" é obrigatório para desativar o MFA.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(password):
            return Response({'error': 'Senha incorreta.'}, status=status.HTTP_400_BAD_REQUEST)

    user.mfa_ativo     = False
    user.mfa_tipo      = None
    user.totp_secret   = None
    user.otp_code      = None
    user.otp_expira_em = None
    user.save(update_fields=['mfa_ativo', 'mfa_tipo', 'totp_secret', 'otp_code', 'otp_expira_em'])

    return Response({'message': 'MFA desativado com sucesso.'})
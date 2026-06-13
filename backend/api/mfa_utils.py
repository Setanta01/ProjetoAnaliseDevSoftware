# backend/api/mfa_utils.py
"""
Utilitários para MFA:
  - Emissão de tokens JWT definitivos / resposta de MFA pendente
  - Envio de OTP por e-mail
  - Geração e verificação do mfa_token (JWT temporário de 5 min)
  - Geração de QR code base64 para TOTP

NOTA: _emitir_tokens e _resposta_mfa_pendente vivem AQUI (e não em views.py)
para que tanto views.py quanto views_mfa.py possam importá-los sem criar
import circular entre os dois módulos de views.
"""

import jwt
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone

from django.conf import settings

from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .email_service import enfileirar_email


# ─── EMISSÃO DE TOKENS / RESPOSTA MFA ─────────────────────────────────────────

def _emitir_tokens(user) -> dict:
    """Retorna o par access/refresh definitivos para um usuário."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def _resposta_mfa_pendente(user) -> Response:
    """
    Resposta padrão quando o usuário passou na senha mas ainda precisa
    completar o segundo fator. Chave padronizada como 'mfa_token'
    (compatível com mfa_challenge e auth_login).
    """
    mfa_token = gerar_mfa_token(user.id)
    return Response({
        'mfa_required': True,
        'mfa_tipo': user.mfa_tipo,   # 'TOTP' | 'EMAIL'
        'mfa_token': mfa_token,       # usado em /api/mfa/challenge/
    }, status=status.HTTP_200_OK)


# ─── MFA TOKEN (JWT temporário) ───────────────────────────────────────────────
# Esse token é emitido no lugar dos tokens definitivos quando MFA está ativo.
# O frontend usa ele para chamar /api/mfa/challenge/ e só então recebe o JWT real.

MFA_TOKEN_TTL_MINUTES = 5
MFA_TOKEN_CLAIM = 'mfa_pending'


def gerar_mfa_token(user_id: int) -> str:
    """
    Gera um JWT de curta duração (5 min) sinalizando que o usuário passou
    na senha mas ainda precisa do segundo fator.
    """
    payload = {
        'user_id': user_id,
        MFA_TOKEN_CLAIM: True,
        'exp': datetime.now(tz=timezone.utc) + timedelta(minutes=MFA_TOKEN_TTL_MINUTES),
        'iat': datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def verificar_mfa_token(token: str) -> int | None:
    """
    Decodifica e valida o mfa_token.
    Retorna o user_id em caso de sucesso, None em caso de falha/expirado.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if not payload.get(MFA_TOKEN_CLAIM):
            return None
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ─── EMAIL OTP ────────────────────────────────────────────────────────────────

def enviar_otp_email(usuario) -> None:
    """
    Gera um OTP de 6 dígitos e agenda seu envio por e-mail.
    """
    code = usuario.gerar_otp_email()

    enfileirar_email(
        usuario.email,
        'Seu código de verificação — Lazuli',
        'mfa_codigo',
        {'nome': usuario.nome, 'codigo': code, 'expiracao_minutos': 10},
    )


# ─── QR CODE TOTP ─────────────────────────────────────────────────────────────

def gerar_qrcode_base64(uri: str) -> str:
    """
    Converte um otpauth:// URI em uma imagem PNG base64
    pronta para ser usada em <img src="data:image/png;base64,...">
    """
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

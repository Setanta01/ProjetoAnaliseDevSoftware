# backend/api/mfa_utils.py
"""
Utilitários para MFA:
  - Envio de OTP por e-mail
  - Geração e verificação do mfa_token (JWT temporário de 5 min)
  - Geração de QR code base64 para TOTP
"""

import jwt
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.core.mail import send_mail


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
    Gera um OTP de 6 dígitos, salva no usuário e envia por e-mail.
    Levanta exceção se o envio falhar (deixa a view tratar).
    """
    code = usuario.gerar_otp_email()

    send_mail(
        subject='Seu código de verificação — Lazuli',
        message=(
            f'Olá, {usuario.nome}!\n\n'
            f'Seu código de verificação é: {code}\n\n'
            f'Ele expira em 10 minutos.\n\n'
            f'Se você não solicitou este código, ignore este e-mail.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.email],
        fail_silently=False,
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
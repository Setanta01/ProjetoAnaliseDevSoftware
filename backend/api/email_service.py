import html

import resend
from django.conf import settings


class EmailDeliveryError(RuntimeError):
    pass


def enviar_email(destinatario: str, assunto: str, corpo: str) -> None:
    api_key = settings.RESEND_API_KEY
    if not api_key:
        raise EmailDeliveryError('RESEND_API_KEY não configurada.')

    resend.api_key = api_key
    try:
        resend.Emails.send({
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': [destinatario],
            'subject': assunto,
            'text': corpo,
            'html': f'<p>{html.escape(corpo).replace(chr(10), "<br>")}</p>',
        })
    except Exception as error:
        raise EmailDeliveryError('O Resend não conseguiu enviar o e-mail.') from error

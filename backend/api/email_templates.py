from dataclasses import dataclass
from typing import Any

from django.template.loader import render_to_string


@dataclass(frozen=True)
class EmailContent:
    title: str
    message: str
    greeting: str = ''
    action_label: str = ''
    action_url: str = ''
    code: str = ''
    detail: str = ''


def _notification(context: dict[str, Any]) -> EmailContent:
    return EmailContent(
        title=str(context.get('titulo', 'Notificação Lazuli')),
        message=str(context.get('mensagem', 'Há uma nova atualização no Lazuli.')),
    )


def _invitation(context: dict[str, Any]) -> EmailContent:
    access = 'administrador global' if context.get('acesso_admin') else 'usuário'
    hours = context.get('expiracao_horas', 24)
    return EmailContent(
        title='Você foi convidado para o Lazuli',
        message=f'Você recebeu um convite para criar uma conta como {access}.',
        action_label='Ativar minha conta',
        action_url=str(context.get('link', '')),
        detail=f'Este convite expira em {hours} horas.',
    )


def _password_recovery(context: dict[str, Any]) -> EmailContent:
    hours = context.get('expiracao_horas', 2)
    return EmailContent(
        title='Redefinição de senha',
        greeting=f"Olá, {context.get('nome', 'usuário')}!",
        message='Recebemos uma solicitação para redefinir sua senha.',
        action_label='Redefinir senha',
        action_url=str(context.get('link', '')),
        detail=f'O link expira em {hours} horas. Se você não fez a solicitação, ignore este e-mail.',
    )


def _mfa_code(context: dict[str, Any]) -> EmailContent:
    minutes = context.get('expiracao_minutos', 10)
    return EmailContent(
        title='Código de verificação',
        greeting=f"Olá, {context.get('nome', 'usuário')}!",
        message='Use o código abaixo para concluir seu acesso ao Lazuli.',
        code=str(context.get('codigo', '')),
        detail=f'O código expira em {minutes} minutos. Se você não tentou entrar, ignore este e-mail.',
    )


def _password_changed(context: dict[str, Any]) -> EmailContent:
    return EmailContent(
        title='Sua senha foi alterada',
        greeting=f"Olá, {context.get('nome', 'usuário')}!",
        message='A senha da sua conta Lazuli foi alterada com sucesso.',
        detail='Se você não realizou esta alteração, entre em contato com o administrador do sistema.',
    )


BUILDERS = {
    'notificacao': _notification,
    'convite': _invitation,
    'recuperacao_senha': _password_recovery,
    'mfa_codigo': _mfa_code,
    'senha_alterada': _password_changed,
}


def renderizar_email(template: str, context: dict[str, Any]) -> tuple[str, str]:
    builder = BUILDERS.get(template, _notification)
    content = builder(context)
    payload = {'email': content}
    text = render_to_string('emails/message.txt', payload).strip()
    html = render_to_string('emails/message.html', payload)
    return text, html

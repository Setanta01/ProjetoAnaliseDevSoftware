from collections.abc import Mapping

from django.db import transaction

from .models import EmailFila


def enfileirar_email(
    destinatario: str,
    assunto: str,
    template: str,
    contexto: Mapping[str, object],
) -> None:
    """Agenda a mensagem somente após a transação atual ser confirmada."""

    payload = dict(contexto)

    def criar_job() -> None:
        EmailFila.objects.create(
            destinatario=destinatario,
            assunto=assunto,
            template=template,
            contexto=payload,
        )

    transaction.on_commit(criar_job)


def enviar_email(destinatario: str, assunto: str, corpo: str) -> None:
    """Compatibilidade para notificações simples já existentes."""
    enfileirar_email(
        destinatario,
        assunto,
        'notificacao',
        {'titulo': assunto, 'mensagem': corpo},
    )

import time
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from api.email_templates import renderizar_email
from api.models import EmailFila


MAX_ATTEMPTS = 3
STALE_AFTER_MINUTES = 5


def claim_next_email():
    now = timezone.now()
    stale_before = now - timedelta(minutes=STALE_AFTER_MINUTES)
    with transaction.atomic():
        job = (
            EmailFila.objects.select_for_update(skip_locked=True)
            .filter(
                Q(status='PENDING', proxima_tentativa_em__lte=now)
                | Q(status='PROCESSING', atualizado_em__lte=stale_before)
            )
            .order_by('criado_em')
            .first()
        )
        if job is None:
            return None

        job.status = 'PROCESSING'
        job.tentativas += 1
        job.ultimo_erro = ''
        job.save(update_fields=['status', 'tentativas', 'ultimo_erro', 'atualizado_em'])
        return job


def send_queued_email(job: EmailFila) -> None:
    text, html = renderizar_email(job.template, job.contexto)
    message = EmailMultiAlternatives(
        subject=job.assunto,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[job.destinatario],
    )
    message.attach_alternative(html, 'text/html')
    message.send(fail_silently=False)


def process_next_email() -> bool:
    job = claim_next_email()
    if job is None:
        return False

    try:
        send_queued_email(job)
    except Exception as error:
        if job.tentativas >= MAX_ATTEMPTS:
            job.status = 'FAILED'
        else:
            job.status = 'PENDING'
            job.proxima_tentativa_em = timezone.now() + timedelta(minutes=job.tentativas)
        job.ultimo_erro = str(error)[:2000]
        job.save(update_fields=[
            'status', 'proxima_tentativa_em', 'ultimo_erro', 'atualizado_em',
        ])
    else:
        job.status = 'SENT'
        job.enviado_em = timezone.now()
        job.save(update_fields=['status', 'enviado_em', 'atualizado_em'])

    return True


class Command(BaseCommand):
    help = 'Processa a fila PostgreSQL de e-mails do Lazuli.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Processa o lote disponível e encerra.')
        parser.add_argument('--interval', type=float, default=2.0, help='Segundos entre consultas à fila.')
        parser.add_argument('--batch-size', type=int, default=20, help='Máximo de mensagens por ciclo.')

    def handle(self, *args, **options):
        while True:
            processed = 0
            while processed < options['batch_size'] and process_next_email():
                processed += 1

            if options['once']:
                self.stdout.write(self.style.SUCCESS(f'{processed} e-mail(s) processado(s).'))
                return

            if processed == 0:
                time.sleep(max(options['interval'], 0.2))

from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = 'Restaura o banco para um estado inicial: apaga todos os dados e reseta sequences.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra as tabelas que seriam limpas sem alterar o banco.',
        )

    def handle(self, *args, **options):
        tables = sorted(
            table for table in connection.introspection.table_names()
            if table != 'django_migrations'
        )

        if not tables:
            self.stdout.write(self.style.SUCCESS('Nenhuma tabela elegível para limpeza.'))
            return

        if options['dry_run']:
            self.stdout.write('Tabelas que seriam limpas:')
            for table in tables:
                self.stdout.write(f'- {table}')
            return

        quoted_tables = ', '.join(connection.ops.quote_name(table) for table in tables)
        sql = f'TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE'

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(sql)

        self.stdout.write(self.style.SUCCESS(f'{len(tables)} tabela(s) limpa(s) com sucesso.'))

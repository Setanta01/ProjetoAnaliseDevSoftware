from django.db import migrations


SQL = """
ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS criterios_aceitacao TEXT;

ALTER TABLE estimativas
    ALTER COLUMN valor TYPE VARCHAR(8)
    USING valor::text;
"""


REVERSE_SQL = """
ALTER TABLE estimativas
    ALTER COLUMN valor TYPE INT
    USING NULLIF(valor, '?')::int;

ALTER TABLE cards
    DROP COLUMN IF EXISTS criterios_aceitacao;
"""


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_email_fila'),
    ]

    operations = [
        migrations.RunSQL(SQL, REVERSE_SQL),
    ]

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_sprint2_cards_estimativas'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE cards
                ADD COLUMN IF NOT EXISTS codigo VARCHAR(4);

            UPDATE cards
            SET codigo = UPPER(LPAD(TO_HEX(id), 4, '0'))
            WHERE codigo IS NULL;

            ALTER TABLE cards
                ALTER COLUMN codigo SET NOT NULL;

            CREATE UNIQUE INDEX IF NOT EXISTS uq_cards_codigo
                ON cards(codigo);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS uq_cards_codigo;
            ALTER TABLE cards
                DROP COLUMN IF EXISTS codigo;
            """,
        ),
    ]

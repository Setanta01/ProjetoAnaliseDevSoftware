from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0003_card_codigo'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE justificativas_prazo
                ALTER COLUMN due_date_anterior DROP NOT NULL,
                ALTER COLUMN due_date_nova DROP NOT NULL;
            """,
            reverse_sql="""
            ALTER TABLE justificativas_prazo
                ALTER COLUMN due_date_anterior SET NOT NULL,
                ALTER COLUMN due_date_nova SET NOT NULL;
            """,
        ),
    ]

# backend/api/migrations/0004_add_mfa_fields.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Ajuste para o nome real da sua última migration
        ('api', '0003_add_task_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE usuarios
                    ADD COLUMN IF NOT EXISTS mfa_ativo     BOOLEAN      DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS mfa_tipo      VARCHAR(10)  DEFAULT NULL,
                    ADD COLUMN IF NOT EXISTS totp_secret   VARCHAR(64)  DEFAULT NULL,
                    ADD COLUMN IF NOT EXISTS google_id     VARCHAR(128) DEFAULT NULL,
                    ADD COLUMN IF NOT EXISTS otp_code      VARCHAR(8)   DEFAULT NULL,
                    ADD COLUMN IF NOT EXISTS otp_expira_em TIMESTAMPTZ  DEFAULT NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_id
                    ON usuarios (google_id)
                    WHERE google_id IS NOT NULL;
            """,
            reverse_sql="""
                ALTER TABLE usuarios
                    DROP COLUMN IF EXISTS mfa_ativo,
                    DROP COLUMN IF EXISTS mfa_tipo,
                    DROP COLUMN IF EXISTS totp_secret,
                    DROP COLUMN IF EXISTS google_id,
                    DROP COLUMN IF EXISTS otp_code,
                    DROP COLUMN IF EXISTS otp_expira_em;

                DROP INDEX IF EXISTS idx_usuarios_google_id;
            """,
        ),
    ]
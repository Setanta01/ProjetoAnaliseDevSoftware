from django.db import migrations


CREATE_EMAIL_QUEUE = """
CREATE TABLE IF NOT EXISTS email_fila (
    id                    BIGSERIAL PRIMARY KEY,
    destinatario          VARCHAR(254) NOT NULL,
    assunto               VARCHAR(255) NOT NULL,
    template              VARCHAR(80)  NOT NULL,
    contexto              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status                VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    tentativas            SMALLINT     NOT NULL DEFAULT 0,
    proxima_tentativa_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ultimo_erro           TEXT         NOT NULL DEFAULT '',
    criado_em             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    enviado_em            TIMESTAMPTZ,
    CONSTRAINT ck_email_fila_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    CONSTRAINT ck_email_fila_tentativas
        CHECK (tentativas >= 0)
);
CREATE INDEX IF NOT EXISTS idx_email_fila_processamento
    ON email_fila(status, proxima_tentativa_em, criado_em);
"""


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.RunSQL(CREATE_EMAIL_QUEUE, migrations.RunSQL.noop)]

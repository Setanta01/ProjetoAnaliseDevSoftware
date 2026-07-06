from django.db import migrations


CREATE_SPRINT_CARD_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS sprint_card_snapshots (
    id SERIAL PRIMARY KEY,
    sprint_id INT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    card_original_id INT NOT NULL,
    codigo VARCHAR(20),
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(10) NOT NULL,
    prioridade VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    coluna_nome VARCHAR(100),
    responsavel_nome VARCHAR(150),
    due_date DATE,
    estimativa_consolidada INT,
    criado_em TIMESTAMPTZ NOT NULL,
    snapshot_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sprint_card_snapshot UNIQUE (sprint_id, card_original_id)
);
CREATE INDEX IF NOT EXISTS idx_sprint_card_snapshots_sprint
    ON sprint_card_snapshots(sprint_id);
"""


DROP_SPRINT_CARD_SNAPSHOTS = """
DROP TABLE IF EXISTS sprint_card_snapshots;
"""


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0004_justificativas_prazo_nullable'),
    ]

    operations = [
        migrations.RunSQL(CREATE_SPRINT_CARD_SNAPSHOTS, DROP_SPRINT_CARD_SNAPSHOTS),
    ]

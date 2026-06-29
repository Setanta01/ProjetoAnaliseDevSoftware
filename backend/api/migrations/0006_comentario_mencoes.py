from django.db import migrations


CREATE_COMENTARIO_MENCOES = """
CREATE TABLE IF NOT EXISTS comentarios_mencoes (
    id SERIAL PRIMARY KEY,
    comentario_id INT NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_comentario_mencao UNIQUE (comentario_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_comentarios_mencoes_comentario
    ON comentarios_mencoes(comentario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_mencoes_usuario
    ON comentarios_mencoes(usuario_id);
"""


DROP_COMENTARIO_MENCOES = """
DROP TABLE IF EXISTS comentarios_mencoes;
"""


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0005_sprint_card_snapshots'),
    ]

    operations = [
        migrations.RunSQL(CREATE_COMENTARIO_MENCOES, DROP_COMENTARIO_MENCOES),
    ]

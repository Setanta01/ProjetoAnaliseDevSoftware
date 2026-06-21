-- =============================================================
-- SCHEMA — Plataforma de Gestão de Projetos
-- Versão 2 — cargos somente no escopo de projeto; admin como boolean
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

-- Cargos existem apenas no contexto de um projeto (projeto_membros)
CREATE TYPE cargo_projeto AS ENUM ('GERENTE', 'DEV', 'QA');

CREATE TYPE sprint_status AS ENUM ('PLANEJADA', 'ATIVA', 'ENCERRADA');

CREATE TYPE card_tipo AS ENUM ('TAREFA', 'BUG');

CREATE TYPE card_prioridade AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

CREATE TYPE vinculo_tipo AS ENUM ('SUBTAREFA', 'RELACIONADO', 'BLOQUEIA', 'BLOQUEADO_POR');

CREATE TYPE validacao_resultado AS ENUM ('APROVADO', 'REPROVADO');

CREATE TYPE notificacao_tipo AS ENUM (
    'ATRIBUICAO',
    'COMENTARIO',
    'SPRINT',
    'PRAZO',
    'IMPEDIMENTO',
    'VALIDACAO',
    'ESTIMATIVA'
);

CREATE TYPE mfa_tipo AS ENUM ('TOTP', 'EMAIL');

-- =============================================================
-- USUÁRIOS
-- Admin é uma flag global do usuário, não um cargo de projeto.
-- Usuários não possuem cargo fora do contexto de um projeto.
-- =============================================================

CREATE TABLE usuarios (
    id             SERIAL PRIMARY KEY,
    nome           VARCHAR(120)  NOT NULL,
    email          VARCHAR(150)  NOT NULL UNIQUE,
    senha_hash     VARCHAR(255),                         -- NULL quando autenticação via Google
    admin          BOOLEAN       NOT NULL DEFAULT FALSE, -- acesso administrativo global
    convidado_por  INT,
    ativo          BOOLEAN       NOT NULL DEFAULT TRUE,

    -- MFA
    mfa_ativo      BOOLEAN       NOT NULL DEFAULT FALSE,
    mfa_tipo       mfa_tipo,
    totp_secret    VARCHAR(64),
    otp_code       VARCHAR(8),
    otp_expira_em  TIMESTAMPTZ,

    -- OAuth
    google_id      VARCHAR(128)  UNIQUE,

    criado_em      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_usuarios_convidador FOREIGN KEY (convidado_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX idx_usuarios_admin ON usuarios(admin);

-- =============================================================
-- CONVITES
-- O convite é para entrar no sistema. Se o usuário for convidado
-- como admin, isso é definido pela flag admin = TRUE em usuarios
-- no momento da ativação. Não há cargo_id global no convite —
-- o cargo no projeto é atribuído quando o membro é adicionado.
-- =============================================================

CREATE TABLE convites_sistema (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(150)  NOT NULL,
    admin      BOOLEAN       NOT NULL DEFAULT FALSE, -- convidar como admin do sistema
    token      VARCHAR(255)  NOT NULL UNIQUE,
    criado_por INT           NOT NULL,
    usado      BOOLEAN       NOT NULL DEFAULT FALSE,
    expira_em  TIMESTAMPTZ   NOT NULL,
    criado_em  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_convite_criador FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_convites_token ON convites_sistema(token);
CREATE INDEX idx_convites_email ON convites_sistema(email);

-- =============================================================
-- SESSÕES / TOKENS JWT (blacklist para logout e expiração)
-- =============================================================

CREATE TABLE sessoes (
    id          SERIAL PRIMARY KEY,
    usuario_id  INT          NOT NULL,
    token_jti   VARCHAR(255) NOT NULL UNIQUE,  -- JWT ID claim
    revogado    BOOLEAN      NOT NULL DEFAULT FALSE,
    expira_em   TIMESTAMPTZ  NOT NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_sessoes_jti     ON sessoes(token_jti);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);

-- =============================================================
-- RECUPERAÇÃO DE SENHA
-- =============================================================

CREATE TABLE recuperacao_senha (
    id          SERIAL PRIMARY KEY,
    usuario_id  INT          NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    usado       BOOLEAN      NOT NULL DEFAULT FALSE,
    expira_em   TIMESTAMPTZ  NOT NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_recuperacao_token ON recuperacao_senha(token);

-- =============================================================
-- PROJETOS
-- =============================================================

CREATE TABLE projetos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    descricao   TEXT,
    criado_por  INT          NOT NULL,
    arquivado   BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_projeto_criador FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- =============================================================
-- MEMBROS DO PROJETO
-- O cargo (GERENTE / DEV / QA) existe SOMENTE aqui,
-- vinculado ao par (projeto, usuário). Um mesmo usuário pode
-- ser GERENTE em um projeto e DEV em outro.
-- =============================================================

CREATE TABLE projeto_membros (
    id             SERIAL PRIMARY KEY,
    projeto_id     INT            NOT NULL,
    usuario_id     INT            NOT NULL,
    cargo          cargo_projeto  NOT NULL,   -- papel deste usuário NESTE projeto
    adicionado_por INT            NOT NULL,
    entrou_em      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_projeto_membro        UNIQUE (projeto_id, usuario_id),
    CONSTRAINT fk_membro_projeto        FOREIGN KEY (projeto_id)     REFERENCES projetos(id)  ON DELETE CASCADE,
    CONSTRAINT fk_membro_usuario        FOREIGN KEY (usuario_id)     REFERENCES usuarios(id),
    CONSTRAINT fk_membro_adicionado_por FOREIGN KEY (adicionado_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_projeto_membros_projeto ON projeto_membros(projeto_id);
CREATE INDEX idx_projeto_membros_usuario ON projeto_membros(usuario_id);

-- =============================================================
-- SPRINTS
-- =============================================================

CREATE TABLE sprints (
    id           SERIAL PRIMARY KEY,
    projeto_id   INT           NOT NULL,
    nome         VARCHAR(100)  NOT NULL,
    data_inicio  DATE,
    data_fim     DATE,
    status       sprint_status NOT NULL DEFAULT 'PLANEJADA',
    criado_por   INT           NOT NULL,
    criado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    encerrada_em TIMESTAMPTZ,

    CONSTRAINT fk_sprint_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    CONSTRAINT fk_sprint_criador FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_sprints_projeto ON sprints(projeto_id);
CREATE INDEX idx_sprints_status  ON sprints(status);

-- Garante no máximo 1 sprint ATIVA e 1 PLANEJADA por projeto
CREATE UNIQUE INDEX idx_sprint_ativa_unica
    ON sprints(projeto_id)
    WHERE status = 'ATIVA';

CREATE UNIQUE INDEX idx_sprint_planejada_unica
    ON sprints(projeto_id)
    WHERE status = 'PLANEJADA';

-- =============================================================
-- COLUNAS DO BOARD (configuráveis por projeto)
-- =============================================================

CREATE TABLE colunas_board (
    id          SERIAL PRIMARY KEY,
    projeto_id  INT          NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    posicao     INT          NOT NULL DEFAULT 0,
    e_inicial   BOOLEAN      NOT NULL DEFAULT FALSE,  -- coluna onde cards são criados
    e_final     BOOLEAN      NOT NULL DEFAULT FALSE,  -- coluna "Done" / concluído

    CONSTRAINT uq_coluna_posicao_projeto UNIQUE (projeto_id, posicao),
    CONSTRAINT fk_coluna_projeto         FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

CREATE INDEX idx_colunas_projeto ON colunas_board(projeto_id);

-- =============================================================
-- PERMISSÕES DE TRANSIÇÃO POR COLUNA
-- Quais cargos de projeto podem mover cards PARA esta coluna.
-- Referencia o enum cargo_projeto diretamente — sem tabela cargos.
-- =============================================================

CREATE TABLE permissoes_coluna (
    id        SERIAL PRIMARY KEY,
    coluna_id INT           NOT NULL,
    cargo     cargo_projeto NOT NULL,

    CONSTRAINT uq_permissao_coluna_cargo UNIQUE (coluna_id, cargo),
    CONSTRAINT fk_permissao_coluna       FOREIGN KEY (coluna_id) REFERENCES colunas_board(id) ON DELETE CASCADE
);

-- =============================================================
-- CARDS (tarefas e bugs)
-- =============================================================

CREATE TABLE cards (
    id                      SERIAL PRIMARY KEY,
    codigo                  VARCHAR(4)      NOT NULL UNIQUE,
    projeto_id              INT             NOT NULL,
    sprint_id               INT,                       -- NULL = backlog
    coluna_id               INT             NOT NULL,
    tipo                    card_tipo       NOT NULL DEFAULT 'TAREFA',
    titulo                  VARCHAR(200)    NOT NULL,
    descricao               TEXT,
    criterios_aceitacao     TEXT,
    prioridade              card_prioridade NOT NULL DEFAULT 'MEDIA',
    posicao                 INT             NOT NULL DEFAULT 0,
    criado_por              INT             NOT NULL,
    responsavel_id          INT,
    story_points            INT,
    due_date                DATE,
    impedido                BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Planning Poker
    pronto_para_estimativa  BOOLEAN         NOT NULL DEFAULT FALSE,
    estimativa_consolidada  INT,

    -- Campos específicos de Bug
    passos_reproducao       TEXT,
    resultado_esperado      TEXT,

    criado_em               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_card_projeto     FOREIGN KEY (projeto_id)     REFERENCES projetos(id)      ON DELETE CASCADE,
    CONSTRAINT fk_card_sprint      FOREIGN KEY (sprint_id)      REFERENCES sprints(id),
    CONSTRAINT fk_card_coluna      FOREIGN KEY (coluna_id)      REFERENCES colunas_board(id),
    CONSTRAINT fk_card_criador     FOREIGN KEY (criado_por)     REFERENCES usuarios(id),
    CONSTRAINT fk_card_responsavel FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_cards_projeto     ON cards(projeto_id);
CREATE INDEX idx_cards_sprint      ON cards(sprint_id);
CREATE INDEX idx_cards_coluna      ON cards(coluna_id);
CREATE INDEX idx_cards_responsavel ON cards(responsavel_id);
CREATE INDEX idx_cards_prioridade  ON cards(prioridade);
CREATE INDEX idx_cards_due_date    ON cards(due_date);

-- =============================================================
-- ORIGEM DO CARD (Hierarquia)
-- =============================================================

ALTER TABLE cards
    ADD COLUMN card_origem_id INT;

ALTER TABLE cards
    ADD CONSTRAINT fk_card_origem
    FOREIGN KEY (card_origem_id) REFERENCES cards(id) ON DELETE SET NULL;

CREATE INDEX idx_cards_card_origem ON cards(card_origem_id);

-- =============================================================
-- VÍNCULOS ENTRE CARDS
-- =============================================================

CREATE TABLE card_vinculos (
    id               SERIAL PRIMARY KEY,
    card_origem_id   INT          NOT NULL,
    card_destino_id  INT          NOT NULL,
    tipo_vinculo     vinculo_tipo NOT NULL,
    criado_por       INT          NOT NULL,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_vinculo         UNIQUE (card_origem_id, card_destino_id, tipo_vinculo),
    CONSTRAINT ck_vinculo_self    CHECK (card_origem_id <> card_destino_id),
    CONSTRAINT fk_vinculo_origem  FOREIGN KEY (card_origem_id)  REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_destino FOREIGN KEY (card_destino_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_criador FOREIGN KEY (criado_por)      REFERENCES usuarios(id)
);

CREATE INDEX idx_vinculos_origem  ON card_vinculos(card_origem_id);
CREATE INDEX idx_vinculos_destino ON card_vinculos(card_destino_id);

-- =============================================================
-- HISTÓRICO DE MOVIMENTAÇÕES DO CARD
-- =============================================================

CREATE TABLE card_historico (
    id                    SERIAL PRIMARY KEY,
    card_id               INT         NOT NULL,
    usuario_id            INT         NOT NULL,
    coluna_anterior_id    INT,
    coluna_nova_id        INT,
    responsavel_anterior  INT,
    responsavel_novo      INT,
    acao                  TEXT        NOT NULL,
    alterado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_historico_card          FOREIGN KEY (card_id)             REFERENCES cards(id)         ON DELETE CASCADE,
    CONSTRAINT fk_historico_usuario       FOREIGN KEY (usuario_id)          REFERENCES usuarios(id),
    CONSTRAINT fk_historico_col_anterior  FOREIGN KEY (coluna_anterior_id)  REFERENCES colunas_board(id),
    CONSTRAINT fk_historico_col_nova      FOREIGN KEY (coluna_nova_id)      REFERENCES colunas_board(id),
    CONSTRAINT fk_historico_resp_anterior FOREIGN KEY (responsavel_anterior) REFERENCES usuarios(id),
    CONSTRAINT fk_historico_resp_novo     FOREIGN KEY (responsavel_novo)     REFERENCES usuarios(id)
);

CREATE INDEX idx_historico_card ON card_historico(card_id);

-- =============================================================
-- JUSTIFICATIVAS DE PRAZO
-- =============================================================

CREATE TABLE justificativas_prazo (
    id                SERIAL PRIMARY KEY,
    card_id           INT         NOT NULL,
    usuario_id        INT         NOT NULL,
    due_date_anterior DATE,
    due_date_nova     DATE,
    justificativa     TEXT        NOT NULL,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_justificativa_card    FOREIGN KEY (card_id)    REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_justificativa_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_justificativas_card ON justificativas_prazo(card_id);

-- =============================================================
-- CHECKLISTS
-- =============================================================

CREATE TABLE checklists (
    id        SERIAL PRIMARY KEY,
    card_id   INT          NOT NULL,
    titulo    VARCHAR(150) NOT NULL,
    posicao   INT          NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_checklist_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_checklists_card ON checklists(card_id);

-- =============================================================
-- ITENS DE CHECKLIST
-- =============================================================

CREATE TABLE checklist_itens (
    id             SERIAL PRIMARY KEY,
    checklist_id   INT          NOT NULL,
    texto          VARCHAR(300) NOT NULL,
    concluido      BOOLEAN      NOT NULL DEFAULT FALSE,
    concluido_por  INT,
    posicao        INT          NOT NULL DEFAULT 0,
    concluido_em   TIMESTAMPTZ,

    CONSTRAINT fk_item_checklist     FOREIGN KEY (checklist_id)  REFERENCES checklists(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_concluido_por FOREIGN KEY (concluido_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_checklist_itens_checklist ON checklist_itens(checklist_id);

-- =============================================================
-- ESTIMATIVAS DE ESFORÇO (Planning Poker)
-- =============================================================

CREATE TABLE estimativas (
    id            SERIAL PRIMARY KEY,
    card_id       INT         NOT NULL,
    usuario_id    INT         NOT NULL,
    valor         VARCHAR(8)  NOT NULL,
    revelada      BOOLEAN     NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_estimativa_card_usuario UNIQUE (card_id, usuario_id),
    CONSTRAINT fk_estimativa_card         FOREIGN KEY (card_id)    REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_estimativa_usuario      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_estimativas_card ON estimativas(card_id);

-- =============================================================
-- VALIDAÇÕES DE QA
-- =============================================================

CREATE TABLE validacoes_qa (
    id         SERIAL PRIMARY KEY,
    card_id    INT                 NOT NULL,
    qa_id      INT                 NOT NULL,
    resultado  validacao_resultado NOT NULL,
    observacao TEXT,
    criado_em  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_validacao_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_validacao_qa   FOREIGN KEY (qa_id)   REFERENCES usuarios(id)
);

CREATE INDEX idx_validacoes_card ON validacoes_qa(card_id);

-- =============================================================
-- COMENTÁRIOS
-- =============================================================

CREATE TABLE comentarios (
    id         SERIAL PRIMARY KEY,
    card_id    INT         NOT NULL,
    usuario_id INT         NOT NULL,
    texto      TEXT        NOT NULL,
    fixado     BOOLEAN     NOT NULL DEFAULT FALSE,
    editado_em TIMESTAMPTZ,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comentario_card    FOREIGN KEY (card_id)    REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_comentario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_comentarios_card ON comentarios(card_id);

-- =============================================================
-- ANEXOS (imagens e evidências de bug)
-- =============================================================

CREATE TABLE anexos (
    id            SERIAL PRIMARY KEY,
    card_id       INT          NOT NULL,
    comentario_id INT,                            -- NULL = anexado direto ao card
    usuario_id    INT          NOT NULL,
    nome_arquivo  VARCHAR(255) NOT NULL,
    url           TEXT         NOT NULL,
    mime_type     VARCHAR(100),
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_anexo_card       FOREIGN KEY (card_id)       REFERENCES cards(id)       ON DELETE CASCADE,
    CONSTRAINT fk_anexo_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_anexo_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)
);

CREATE INDEX idx_anexos_card ON anexos(card_id);

-- =============================================================
-- NOTIFICAÇÕES
-- =============================================================

CREATE TABLE notificacoes (
    id         SERIAL PRIMARY KEY,
    usuario_id INT              NOT NULL,
    tipo       notificacao_tipo NOT NULL,
    mensagem   TEXT             NOT NULL,
    lida       BOOLEAN          NOT NULL DEFAULT FALSE,
    card_id    INT,
    sprint_id  INT,
    criado_em  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_card    FOREIGN KEY (card_id)    REFERENCES cards(id)    ON DELETE SET NULL,
    CONSTRAINT fk_notif_sprint  FOREIGN KEY (sprint_id)  REFERENCES sprints(id)  ON DELETE SET NULL
);

CREATE INDEX idx_notificacoes_usuario      ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

-- =============================================================
-- FILA DE E-MAIL
-- =============================================================

CREATE TABLE email_fila (
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

CREATE INDEX idx_email_fila_processamento
    ON email_fila(status, proxima_tentativa_em, criado_em);

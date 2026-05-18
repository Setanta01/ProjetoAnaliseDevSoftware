-- =====================================================
-- CARGOS
-- =====================================================
CREATE TABLE cargos (
    id   SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
    -- ADMIN | GERENTE | DEV | QA
);

-- =====================================================
-- USUÁRIOS
-- =====================================================
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    senha         VARCHAR(255) NOT NULL,
    cargo_id      INT NOT NULL,
    convidado_por INT NULL,
    ativo         BOOLEAN DEFAULT TRUE,
    criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo_id)      REFERENCES cargos(id),
    FOREIGN KEY (convidado_por) REFERENCES usuarios(id)
);

-- =====================================================
-- CONVITES
-- =====================================================
CREATE TABLE convites_sistema (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(150) NOT NULL,
    cargo_id   INT NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    criado_por INT NOT NULL,
    usado      BOOLEAN DEFAULT FALSE,
    expira_em  TIMESTAMP NOT NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo_id)   REFERENCES cargos(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- =====================================================
-- PROJETOS
-- =====================================================
CREATE TABLE projetos (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    descricao  TEXT,
    criado_por INT NOT NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- =====================================================
-- PARTICIPANTES DO PROJETO
-- =====================================================
CREATE TABLE projeto_participantes (
    id            SERIAL PRIMARY KEY,
    projeto_id    INT NOT NULL,
    usuario_id    INT NOT NULL,
    convidado_por INT NOT NULL,
    entrou_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (projeto_id)    REFERENCES projetos(id),
    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id),
    FOREIGN KEY (convidado_por) REFERENCES usuarios(id),

    UNIQUE (projeto_id, usuario_id)
);

-- =====================================================
-- BACKLOG
-- =====================================================
CREATE TABLE backlogs (
    id         SERIAL PRIMARY KEY,
    projeto_id INT NOT NULL UNIQUE,
    nome       VARCHAR(100) DEFAULT 'Backlog Principal',

    FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

-- =====================================================
-- SPRINTS
-- =====================================================
CREATE TYPE sprint_status AS ENUM ('PLANEJADA', 'ATIVA', 'CONCLUIDA');

CREATE TABLE sprints (
    id          SERIAL PRIMARY KEY,
    projeto_id  INT NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    data_inicio DATE,
    data_fim    DATE,
    status      sprint_status DEFAULT 'PLANEJADA',
    criado_por  INT NOT NULL,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (projeto_id) REFERENCES projetos(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- =====================================================
-- TASKS
-- =====================================================
CREATE TYPE task_status AS ENUM (
    'BACKLOG','TODO','EM_ANDAMENTO','REVISAO','CONCLUIDO','BLOQUEADO'
);
CREATE TYPE task_prioridade AS ENUM ('BAIXA','MEDIA','ALTA','CRITICA');

CREATE TABLE tasks (
    id             SERIAL PRIMARY KEY,
    projeto_id     INT NOT NULL,
    backlog_id     INT NOT NULL,
    sprint_id      INT NULL,
    titulo         VARCHAR(150) NOT NULL,
    descricao      TEXT,
    status         task_status DEFAULT 'BACKLOG',
    prioridade     task_prioridade DEFAULT 'MEDIA',
    posicao        INT DEFAULT 0,
    criado_por     INT NOT NULL,
    responsavel_id INT NULL,
    criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    story_points   INT NULL,           
    due_date       DATE NULL,          
    tags           VARCHAR(255) NULL,  

    FOREIGN KEY (projeto_id)     REFERENCES projetos(id),
    FOREIGN KEY (backlog_id)     REFERENCES backlogs(id),
    FOREIGN KEY (sprint_id)      REFERENCES sprints(id),
    FOREIGN KEY (criado_por)     REFERENCES usuarios(id),
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);

-- =====================================================
-- SUBTASKS
-- =====================================================
CREATE TYPE subtask_status AS ENUM ('TODO','EM_ANDAMENTO','CONCLUIDO');

CREATE TABLE subtasks (
    id             SERIAL PRIMARY KEY,
    task_id        INT NOT NULL,
    titulo         VARCHAR(150) NOT NULL,
    status         subtask_status DEFAULT 'TODO',
    posicao        INT DEFAULT 0,
    responsavel_id INT NULL,
    criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)        REFERENCES tasks(id),
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
CREATE TABLE comentarios (
    id         SERIAL PRIMARY KEY,
    task_id    INT NOT NULL,
    usuario_id INT NOT NULL,
    texto      TEXT NOT NULL,
    editado_em TIMESTAMP NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)    REFERENCES tasks(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =====================================================
-- HISTÓRICO DE TASKS
-- =====================================================
CREATE TABLE task_historico (
    id              SERIAL PRIMARY KEY,
    task_id         INT NOT NULL,
    usuario_id      INT NOT NULL,
    status_anterior task_status NULL,
    status_novo     task_status NOT NULL,
    alterado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)    REFERENCES tasks(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
CREATE TYPE notificacao_tipo AS ENUM ('ATRIBUICAO','COMENTARIO','SPRINT');

CREATE TABLE notificacoes (
    id         SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo       notificacao_tipo NOT NULL,
    mensagem   TEXT NOT NULL,
    lida       BOOLEAN DEFAULT FALSE,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_id    INT NULL,
    sprint_id  INT NULL,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (task_id)    REFERENCES tasks(id),
    FOREIGN KEY (sprint_id)  REFERENCES sprints(id)
);

-- =====================================================
-- DADOS INICIAIS — cargos
-- =====================================================
INSERT INTO cargos (nome) VALUES ('ADMIN'), ('GERENTE'), ('DEV'), ('QA');
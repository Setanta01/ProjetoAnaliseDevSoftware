# Project and Sprint Management Implementation Plan

## Objetivo

Implementar a Sprint 2 com baixo acoplamento e baixo excesso de codigo,
priorizando compatibilidade real entre frontend e backend para projetos,
equipe, sprints, cards, movimentacao, Planning Poker e encerramento.

## Checklist de Progresso

### 0. Confirmacao e Contratos

- [x] Ler `Documento de Priorização.pdf`.
- [x] Comparar Sprint 2 com `fluxos_de_uso.md`.
- [x] Comparar contratos com `endpoints-resumido.md`.
- [x] Conferir schema SQL relevante.
- [x] Registrar interpretacoes e perguntas abertas.
- [x] Confirmar com o usuario as regras principais de projeto, equipe, colunas,
  card, Planning Poker e encerramento.
- [x] Confirmar perguntas restantes de produto antes de alterar regra de
  negocio.
- [x] Validar e alinhar payloads reais das rotas existentes contra o frontend
  atual.

### 1. Projetos e Equipe

- [x] Garantir que `POST /api/admin/projetos/` cria projeto e colunas padrao.
- [x] Garantir que projeto novo tenha ao menos um `GERENTE`, sem adicionar o
  admin criador automaticamente se ele nao escolher isso.
- [x] Conectar tela **Projetos Admin** a criar, editar, arquivar/excluir com
  confirmacao dupla.
- [x] Conectar **Meus Projetos** exclusivamente a `/api/projetos/`.
- [x] Conectar membros do projeto a `/api/projetos/<id>/membros/`.
- [x] Adicionar UI simples para incluir membro existente do sistema e cargo
  contextual.
- [x] Bloquear tentativa de adicionar a projeto um e-mail que ainda nao possui
  conta.
- [x] Manter gerenciamento de cargos apenas dentro do projeto.

### 2. Sprints e Backlog

- [x] Conectar listagem de sprints a `/api/projetos/<id>/sprints/`.
- [x] Criar UI de sprint planejada no contexto do projeto.
- [x] Garantir que sprint planejada nao pede datas.
- [x] Manter rigida a regra de no maximo uma sprint `PLANEJADA` por projeto.
- [x] Exibir estado vazio quando nao houver sprint ativa.
- [x] Permitir iniciar sprint planejada via `/api/sprints/<id>/iniciar/`.
- [x] Conectar Backlog a `/api/projetos/<id>/backlog/`.
- [x] Criar card no backlog ou na sprint usando `/api/projetos/<id>/cards/`.
- [x] Permitir mover backlog para a sprint ativa, entrando sempre em `To do`.
- [~] Ao mover backlog para sprint, revisar dados especificos da sprint em
  fluxo dedicado quando for necessario refinar a experiencia.
- [x] Criacao no backlog limitada a dados independentes da sprint; prioridade,
  responsavel, deadline e dificuldade/Planning Poker ficam para cards em sprint.
- [x] Permitir marcar card de sprint como aguardando Planning Poker na criacao.
- [x] Corrigir divergencias de status: usar `ENCERRADA`, nao `CONCLUIDA`, se o
  backend mantiver o enum atual.

### 3. Board e Movimentacao

- [x] Consumir `GET /api/sprints/<id>/` como payload agregado do board.
- [x] Renderizar colunas a partir de `colunas_board`, ordenadas por `posicao`.
- [x] Manter colunas fixas: `To do`, `In Progress`, `Review`, `Done`.
- [x] Manter nomes das colunas em ingles para esta entrega, enquanto o restante
  da aplicacao continua em pt-BR.
- [x] Usar **Board** como nome da area de quadro.
- [x] Mover card por `PATCH /api/cards/<id>/` com `coluna_id`.
- [x] Centralizar movimentacao de coluna no Board por drag-and-drop com
  `dnd-kit`; edicao do card nao altera coluna.
- [x] Permitir que usuario responsavel pelo card mova esse card entre colunas,
  mesmo sem cargo `GERENTE`.
- [x] Alterar responsavel por `PATCH /api/cards/<id>/` com `responsavel_id`.
- [x] Permitir que qualquer membro assuma card sem responsavel.
- [x] Invalidar queries relevantes apos mutacoes.
- [x] Usar optimistic update simples apenas no movimento de card, com rollback
  automatico se o backend rejeitar permissao.
- [ ] Registrar e exibir historico basico quando abrir o card.

### 4. Planning Poker

- [x] Gerente marca card para estimativa via
  `/api/cards/<id>/estimativas/enviar/`.
- [x] Dev/QA vota via `/api/cards/<id>/estimativas/`.
- [x] Antes da revelacao, cada membro ve apenas o proprio voto.
- [x] Gerente visualiza quem ja votou sem revelar os valores privados.
- [x] Gerente revela e grava `estimativa_consolidada` via
  `/api/cards/<id>/estimativas/revelar/`.
- [x] Detalhe do card atualiza o botao/estado visual depois do voto ou
  fechamento do Planning Poker.
- [x] Permitir que o gerente encerre a estimativa mesmo sem todos votarem.
- [x] Usar escala `[1, 2, 3, 5, 8, 13, 21]` e `?`.
- [x] Atualizar badge/flag visual do card quando `pronto_para_estimativa` estiver
  ativo.

### 5. Encerramento de Sprint

- [x] Criar tela/dialogo simples para encerrar sprint ativa.
- [x] Listar cards nao concluidos e exigir destino: backlog ou proxima sprint.
- [x] Usar sprint ja `PLANEJADA` ao encerrar; nao pedir nome de sprint no
  encerramento.
- [x] Permitir encerrar e pausar o projeto, deixando migracao de pendencias para
  quando a sprint planejada for iniciada.
- [x] Chamar `/api/sprints/<id>/encerrar/` com `acao`, `proxima_sprint_id`,
  `cards_para_backlog` e `cards_para_sprint`.
- [x] Atualizar historico e redirecionar para a sprint/projeto correto apos
  encerramento.

### 6. Qualidade Minima

- [~] Testar backend com foco em projetos, membros, sprint lifecycle, card
  creation/movement e Planning Poker.
- [x] Testar frontend com typecheck, lint e build.
- [ ] Adicionar apenas testes simples e descartaveis quando eles verificarem
  contrato sem aumentar peso arquitetural.
- [x] Atualizar esta documentacao depois de cada bloco fechado.
- [x] Corrigir permissoes visuais para DEV/QA nao verem acoes de GERENTE como
  criar sprint, criar card e gerenciar cargos.
- [x] Corrigir IDs de card para codigo curto unico de 4 caracteres.
- [x] Permitir remover cards do backlog quando o usuario pode gerenciar o
  projeto.

## Contratos Esperados Pelo Frontend

### Projetos

- `GET /api/projetos/`: retorna projetos em que o usuario e membro, incluindo
  `id`, `nome`, `descricao`, `meu_cargo`, `member_count` ou equivalente.
- `GET /api/admin/projetos/`: retorna todos os projetos para admin, incluindo
  estado arquivado/inativo e contagem de membros.
- `POST /api/admin/projetos/`: cria projeto e colunas padrao.
- Projeto criado deve possuir ao menos um `GERENTE`, mas o admin criador nao
  vira membro automaticamente sem escolha explicita.
- `PATCH /api/projetos/<id>/`: edita nome, descricao ou arquivamento quando
  permitido.
- `DELETE /api/admin/projetos/<id>/`: arquiva projeto com dupla confirmacao.

### Membros

- `GET /api/projetos/<id>/membros/`: retorna usuario, e-mail e cargo contextual.
- `POST /api/projetos/<id>/membros/`: adiciona usuario existente com cargo.
- Usuario precisa existir antes de ser adicionado ao projeto.
- `PATCH /api/projetos/<id>/membros/<usuario_id>/`: altera cargo.
- `DELETE /api/projetos/<id>/membros/<usuario_id>/`: remove membro e desatribui
  seus cards.

### Sprints

- `GET /api/projetos/<id>/sprints/`: retorna planejada, ativa e encerradas.
- `POST /api/projetos/<id>/sprints/`: cria sprint `PLANEJADA` com `nome`.
- O projeto continua limitado a no maximo uma sprint `PLANEJADA`.
- `POST /api/sprints/<id>/iniciar/`: muda `PLANEJADA` para `ATIVA` e, se o
  projeto estava pausado, migra pendencias da ultima sprint encerrada para
  `To do`.
- `GET /api/sprints/<id>/`: retorna sprint agregada com colunas, cards e flags.
- `POST /api/sprints/<id>/encerrar/`: encerra e inicia uma sprint ja planejada
  ou pausa o projeto.

### Cards

- `GET /api/projetos/<id>/backlog/`: cards sem sprint.
- `POST /api/projetos/<id>/cards/`: cria card.
- Somente `GERENTE` cria card.
- Card pode nascer no backlog ou na coluna `To do` de uma sprint.
- `due_date` e dificuldade/estimativa sao opcionais.
- Dificuldade pode ser informada manualmente ou definida pelo Planning Poker.
- Criacao no backlog nao mostra prioridade, responsavel, deadline ou
  dificuldade. Esses campos sao especificos da entrada/execucao em sprint.
- `GET /api/cards/<id>/`: detalhe completo.
- `PATCH /api/cards/<id>/`: edita campos, `coluna_id`, `responsavel_id` e
  `due_date` quando aplicavel. No frontend, `coluna_id` deve ser enviado apenas
  pelo Board. Tambem aceita `sprint_id` para mover card de backlog para sprint
  ativa, sempre posicionando o card em `To do`.
- Usuarios sem cargo `GERENTE` podem enviar `responsavel_id` apenas para assumir
  um card ainda sem responsavel, e podem enviar `coluna_id` apenas em cards sob
  sua responsabilidade.
- `DELETE /api/cards/<id>/`: remove card quando o usuario tem permissao de
  gerenciamento.
- `GET /api/cards/<id>/historico/`: historico de mudancas.

### Planning Poker

- `POST /api/cards/<id>/estimativas/enviar/`
- `GET /api/cards/<id>/estimativas/`
- `POST /api/cards/<id>/estimativas/`
- `POST /api/cards/<id>/estimativas/revelar/`
- Antes da revelacao, gerente ve participantes que ja votaram, mas nao ve os
  valores privados.
- Revelacao pode ocorrer antes de todos votarem e define a dificuldade final.

## Cuidados de Implementacao

- Nao criar novo estado global para projeto/sprint se React Query e URL
  resolvem o fluxo.
- Nao duplicar fixtures como fonte de verdade; o contrato real da API deve
  orientar a UI.
- Nao esconder falhas de permissao no frontend; backend decide, frontend apenas
  comunica.
- Nao adicionar WebSocket/Celery/Redis para Sprint 2.
- Nao ampliar Sprint 2 para QA completo ou notificacoes avancadas.
- Evitar novos componentes genericos antes de haver repeticao real.

## Riscos Identificados

- [x] O frontend ainda parecia chamar rotas antigas `/tasks/...` em detalhes,
  comentarios e checklist. Corrigido para `/cards/...` nos fluxos principais.
- [x] O frontend usava `CONCLUIDA` em historico, enquanto o schema define
  `ENCERRADA`. Corrigido.
- [x] O payload agregado de `GET /api/sprints/<id>/` precisava ser comparado com
  o formato esperado pelo `BoardView`. Board agora consome esse payload.
- Comentarios antigos em `backend/api/urls.py` dizem que algumas views precisam
  ser criadas, embora existam implementacoes em `views.py`; isso pode confundir
  agentes futuros.
- A regra de criador do projeto virar membro/gerente precisa confirmacao para
  evitar projeto criado sem `GERENTE`. Confirmado: o criador nao entra
  automaticamente; o fluxo precisa exigir pelo menos um `GERENTE`.
- O fluxo de mover backlog para sprint precisa preservar dados do backlog e
  pedir apenas informacoes especificas da sprint. Parcial: a criacao/edicao de
  card suporta os campos, mas ainda falta uma acao dedicada "mover para sprint"
  a partir de uma linha do backlog.

## Decisoes Confirmadas

1. Admin criador nao entra automaticamente como `GERENTE`.
2. Todo projeto precisa ter ao menos um `GERENTE`.
3. Membros de projeto sao selecionados apenas entre usuarios existentes.
4. Encerramento deve exigir configuracao da proxima sprint.
5. Colunas sao fixas: `To do`, `In Progress`, `Review`, `Done`.
6. A area de quadro deve ser chamada de **Board**.
7. Apenas `GERENTE` cria cards.
8. Card entra inicialmente no backlog ou `To do`.
9. Deadline e dificuldade sao opcionais.
10. Dificuldade pode ser manual ou resultante de Planning Poker.
11. Gerente pode encerrar Planning Poker sem todos votarem.
12. Escala de Planning Poker: `[1, 2, 3, 5, 8, 13, 21]` e `?`.
13. A regra de no maximo uma sprint planejada por projeto continua rigida.
14. Proxima sprint e criada/configurada dentro do dialogo de encerramento.
15. Colunas ficam em ingles nesta entrega; o restante da aplicacao continua em
    pt-BR.
16. Backlog -> sprint permite revisar prioridade, titulo, descricao, criterios
    de aceitacao, responsavel, deadline e dificuldade/Planning Poker.

## Perguntas Restantes Antes de Codigo

Nao ha perguntas de produto bloqueantes para iniciar codigo. Antes de
implementar, ainda vale validar payloads reais das rotas existentes e decidir o
comportamento visual de rollback para drag-and-drop rejeitado pelo backend.

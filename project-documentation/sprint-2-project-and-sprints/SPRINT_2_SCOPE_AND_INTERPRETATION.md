# Sprint 2: Escopo e Interpretacao

## Objetivo

Preparar a implementacao da Sprint 2 descrita em `Documento de Priorização.pdf`,
mantendo coerencia com `fluxos_de_uso.md`, `endpoints-resumido.md`,
`Documento de Arquitetura de Software.md`, `AGENTS.md` e o schema SQL.

Sprint 2 e o fluxo obrigatorio de apresentacao: o usuario deve conseguir
criar/entrar em um projeto, estruturar equipe, planejar uma sprint, criar
cards, estimar trabalho, executar movimentacoes basicas e encerrar o ciclo
migrando pendencias. O termo "MVP" aqui nao cria uma regra adicional; ele apenas
descreve o recorte funcional priorizado pelo documento de priorizacao.

## Escopo Priorizado

| Grupo | Historias | Interpretacao para implementacao |
| --- | --- | --- |
| Criacao de projetos e equipe | US08, US09, US11 | Admin cria projetos em `Projetos Admin`; admin ou gerente do projeto adiciona membros existentes e define cargo contextual `GERENTE`, `DEV` ou `QA`. O criador admin nao precisa ser membro do projeto. |
| Gestao de sprints e execucao | US14, US22, US25 | Gerente cria sprint `PLANEJADA`, cria cards no backlog ou sprint, inicia sprint, move cards entre colunas e altera responsavel com historico. |
| Planning Poker | US19, US20, US21 | Gerente marca card para estimativa, devs/QAs votam secretamente, gerente revela votos e grava estimativa consolidada. |
| Encerramento do ciclo | US16, US17 | Gerente encerra sprint ativa e informa destino explicito das pendencias: backlog ou proxima sprint. |

## Regras Confirmadas Pelos Documentos

- A tela inicial autenticada e **Meus Projetos**.
- Admin tem duas visoes: **Meus Projetos** para projetos dos quais participa e
  **Projetos Admin** para administracao global.
- Board, Backlog, membros e historico de sprints so aparecem depois da escolha
  de um projeto.
- Cargos sao contextuais por projeto em `projeto_membros`; nao existe cargo
  global de gerente/dev/QA.
- O admin gerencia dados de alto nivel de qualquer projeto pela pagina admin,
  mas `GERENTE` e o papel envolvido na rotina do projeto.
- O admin que cria um projeto nao precisa entrar automaticamente como `GERENTE`;
  ele pode se adicionar ou indicar outra pessoa.
- Todo projeto deve ter ao menos um membro `GERENTE`.
- Membros de projeto so podem ser selecionados entre usuarios ja cadastrados no
  sistema.
- Projeto novo cria colunas Kanban padrao automaticamente.
- As colunas do board sao fixas, nao criadas manualmente por usuarios. Para a
  Sprint 2, a estrutura padrao e `To do`, `In Progress`, `Review`, `Done`.
  O nome exibido pode mudar para pt-BR depois, mas a estrutura permanece.
- Dentro dessa estrutura, a area `Quadro` deve ser chamada de **Board**.
- Sprints `PLANEJADA` nascem sem `data_inicio` e sem `data_fim`.
- O sistema permite no maximo uma sprint `ATIVA` e uma `PLANEJADA` por projeto.
- Cards sem `sprint_id` pertencem ao backlog.
- Ao alocar card em sprint, a coluna deve ser a inicial do board do projeto.
- Somente `GERENTE` cria cards.
- Um card novo entra inicialmente no backlog ou na coluna `To do` de uma
  sprint. Qualquer card que entra em uma sprint deve ir para `To do`.
- Dificuldade/estimativa de card e opcional. O `GERENTE` pode preencher
  manualmente ou iniciar Planning Poker para definir a dificuldade ao encerrar a
  votacao.
- Deadline de card tambem e opcional.
- O status do card e derivado de `coluna_id`; nao deve ser persistido como
  campo separado.
- Movimentacao de coluna e alteracao de responsavel devem gerar
  `card_historico`.
- Votos de Planning Poker ficam ocultos ate a revelacao pelo gerente.
- O `GERENTE` pode encerrar o Planning Poker mesmo sem todos votarem. A
  interface deve mostrar ao gerente quem ja votou antes da decisao.
- A escala aceita para Planning Poker e `[1, 2, 3, 5, 8, 13, 21]` e `?`.
- Encerramento de sprint deve tratar cards pendentes explicitamente.
- Ao encerrar uma sprint, o gerente escolhe entre mover pendencias para a sprint
  ja planejada ou pausar o projeto.
- A proxima sprint nao e nomeada no encerramento; ela deve existir previamente
  como `PLANEJADA`. Se o projeto for pausado, a migracao dos cards pendentes
  ocorre quando a sprint planejada for iniciada.
- Ao mover uma tarefa do backlog para `To do` na sprint, o formulario/fluxo deve
  abrir com os dados existentes do backlog pre-preenchidos e aguardar as
  informacoes especificas daquela sprint.
- Nesse fluxo backlog -> sprint, o gerente pode revisar prioridade, titulo,
  descricao, criterios de aceitacao, responsavel, deadline e dificuldade ou
  Planning Poker.
- Notificacoes visuais do board devem ser flags contextuais no payload, nao um
  componente global de sino.

## Fora do Escopo Principal da Sprint 2

Estes itens aparecem nos documentos, mas pertencem a sprints posteriores ou a
acabamento funcional:

- QA completo: validacao, aprovacao/reprovacao e criacao formal de bugs.
- Permissoes avancadas de transicao por coluna alem do minimo necessario para
  nao quebrar o fluxo.
- Checklists, comentarios, anexos, vinculos, impedimentos e justificativa de
  prazo completa.
- Filtros pessoais, visualizacao flexivel, ordenacao automatica por prioridade
  e notificacoes avancadas.

Algumas dessas estruturas ja existem no schema e em partes do codigo, mas nao
devem ampliar o escopo da Sprint 2 se isso comprometer simplicidade.

## Leitura do Estado Atual

O backend ja possui modelos, schema e rotas para boa parte do dominio de Sprint
2: projetos, membros, sprints, backlog, cards, historico e Planning Poker. Mesmo
assim, comentarios antigos em `backend/api/urls.py` ainda indicam algumas views
como pendentes. Antes de implementar UI em cima desses contratos, e necessario
validar as respostas reais, permissões e nomes de campos.

O frontend ja possui telas para **Meus Projetos**, **Projetos Admin**, Board,
Backlog, Membros, Historico de Sprints, criacao de card, detalhe de card e
Planning Poker. Parte delas ainda usa contratos antigos, como rotas
`/tasks/...`, status `CONCLUIDA` no historico e fixtures normalizadas.

## Interpretacao Recomendada

1. Manter a Sprint 2 centrada em uma jornada simples:
   **criar projeto -> adicionar gerente/dev/QA -> criar sprint planejada ->
   criar cards -> iniciar sprint -> mover/atribuir cards -> estimar ->
   encerrar/migrar pendencias**.
2. Priorizar compatibilidade frontend/backend antes de acabamento visual novo.
3. Usar React Query para server state, invalidação e pequenas atualizacoes
   otimistas onde reduzem complexidade perceptivel, principalmente board e
   Planning Poker.
4. Evitar nova camada de abstracao global para permissao; validar no backend e
   espelhar no frontend apenas para UX.
5. Preservar os componentes e tokens do design system existente.

## Decisoes Confirmadas Pelo Usuario

1. Admin criador do projeto nao precisa ser membro; ele pode se tornar
   `GERENTE` ou indicar outra pessoa.
2. O projeto precisa ter ao menos um `GERENTE`.
3. Membros adicionados a projeto devem ser usuarios existentes no sistema.
4. Ao encerrar uma sprint, o gerente pode iniciar a sprint planejada seguinte ou
   pausar o projeto temporariamente.
5. Colunas padrao: `To do`, `In Progress`, `Review`, `Done`; fixas na estrutura.
6. O termo de interface para o quadro deve ser **Board**.
7. Somente `GERENTE` cria cards.
8. Cards entram no backlog ou na coluna `To do` de uma sprint.
9. Dificuldade e deadline sao opcionais.
10. Dificuldade pode ser manual ou definida ao fim do Planning Poker.
11. O `GERENTE` pode encerrar Planning Poker sem todos votarem, mas deve ver
    quem votou.
12. Escala de Planning Poker confirmada: `[1, 2, 3, 5, 8, 13, 21]` e `?`.
13. Continua rigida a regra de no maximo uma sprint `PLANEJADA` por projeto.
14. A proxima sprint deve ser criada antes do encerramento caso o gerente queira
    mover pendencias imediatamente.
15. Os nomes das colunas ficam em ingles nesta entrega. O restante da aplicacao
    continua em pt-BR.
16. Ao criar card no backlog, o formulario evita campos especificos de sprint
    como prioridade, responsavel, deadline e dificuldade. Esses campos aparecem
    quando o card for preparado para entrar na sprint.

## Perguntas Ainda Abertas

Nao ha perguntas de produto bloqueantes para iniciar a implementacao da Sprint
2. Restam decisoes tecnicas de execucao registradas em `DECISIONS_AND_REASONS.md`,
como comportamento visual de drag-and-drop/rollback e responsividade.

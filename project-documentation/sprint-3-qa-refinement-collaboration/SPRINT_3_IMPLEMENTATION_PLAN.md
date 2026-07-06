# Sprint 3 Implementation Plan

## Objetivo

Completar a Sprint 3 com mudancas incrementais e alinhadas a arquitetura atual:
QA, bugs, permissoes, prioridade, historico, checklists e comentarios, alem dos
itens de reatividade, drag-and-drop e criticas de arquitetura levantados pelo
usuario.

## Checklist de Progresso

### 0. Confirmacao e Contratos

- [x] Ler `Documento de Priorização.pdf`.
- [x] Identificar Sprint 3 como escopo principal.
- [x] Comparar escopo com `fluxos_de_uso.md` e `endpoints-resumido.md`.
- [x] Verificar backend atual em `models.py`, `views.py` e `urls.py`.
- [x] Verificar frontend atual em views, modais e componentes de Board.
- [x] Confirmar com o usuario os pontos de produto em aberto antes de mudar
      regras de dominio.
- [x] Atualizar `endpoints-resumido.md` se algum contrato real divergir do
      plano aprovado.

### 1. QA e Validacao

- [x] Confirmar que `ValidacaoQA` existe no modelo.
- [x] Confirmar que `GET|POST /api/cards/<id>/validacao/` existe no backend.
- [x] Adicionar tipos frontend para validacao QA.
- [x] No modal do card, carregar historico de validacoes quando o card estiver
      em etapa de QA ou quando houver validacoes.
- [x] Mostrar acao de QA para `APROVADO` e `REPROVADO` apenas a usuario com
      cargo contextual `QA` ou admin.
- [x] Ao aprovar, registrar validacao e atualizar Board/card.
- [x] Ao reprovar, exigir observacao e oferecer criacao de BUG vinculado ao
      card original.
- [x] Exibir no card um resumo da ultima validacao QA.
- [x] Garantir que validacao gere historico e notificacao para responsavel.

### 2. Transicoes e Permissoes

- [x] Definir nome canonico da coluna de validacao: manter `Review` ou migrar
      para `Validação`/`Validacao`.
- [x] Revisar `COLUNA_VALIDACAO_NOME` contra as colunas criadas por projeto.
- [ ] Decidir se a regra de movimento deve usar `PermissaoColuna` ou manter
      regras hardcoded para Sprint 3.
- [ ] Se usar `PermissaoColuna`, criar dados padrao por coluna/cargo na criacao
      de projeto.
- [ ] Backend deve bloquear transicoes invalidas mesmo se o frontend permitir.
- [ ] Frontend deve desabilitar drag ou mostrar erro claro quando uma transicao
      for negada pelo backend.
- [ ] Cobrir regra QA: quem pode mover para validacao, quem pode aprovar/reprovar
      e quem pode mover para fora apos reprovacao/aprovacao.

### 3. Bugs e Evidencias

- [x] Confirmar suporte backend para `tipo=BUG`, `passos_reproducao`,
      `resultado_esperado` e `card_origem_id`.
- [x] Confirmar formulario basico de criacao de BUG.
- [x] Exibir `resultado_esperado` e card de origem no detalhe do BUG.
- [x] Criar acao "Criar bug desta reprovacao" no fluxo QA.
- [x] Preencher bug com titulo, descricao, passos, resultado esperado e
      `card_origem_id`.
- [x] Listar bugs gerados a partir do card original ou mostrar link para o bug.
- [ ] Conectar upload/listagem de anexos para evidencias de bug, se isso for
      necessario para a apresentacao da Sprint 3.

### 4. Organizacao e Colaboracao

- [x] Prioridade existe no backend e frontend.
- [x] Historico de sprints existe em tela propria.
- [x] Checklists existem no backend e no modal.
- [x] Comentarios existem no backend e no modal.
- [x] Trocar a linha fixa de atividade no `CardDetailModal` por dados reais de
      `GET /api/cards/<id>/historico/`.
- [x] Incluir mudancas relevantes no historico visual: coluna, responsavel,
      validacao QA, impedimento e prazo enquanto `due_date` ainda existir.
- [x] Permitir editar/remover comentario pela UI se isso for exigido na
      apresentacao.
- [x] Avaliar se checklists precisam de titulo editavel ou apenas itens simples
      sao suficientes para Sprint 3.

### 5. Auto Update e Reatividade

- [x] Inventariar telas com dados compartilhados e sua politica atual de React
      Query.
- [x] Manter Board com short polling leve.
- [x] Adicionar `refetchInterval` ou `refetchOnWindowFocus` nas telas que ficam
      defasadas: `MyProjectsView`, `AdminProjectsView`, `SprintHistoryView`,
      `ProjectMembersView` e `BacklogView`, conforme necessidade real.
- [x] Padronizar invalidacoes apos mutacoes que afetam projeto, membros,
      sprints, backlog, board, card, comentarios e checklist.
- [ ] Testar caso com duas abas ou dois usuarios para confirmar que nao exige
      troca de pagina.

### 6. Drag-and-Drop

- [ ] Reproduzir animacao em que o card volta visualmente para a coluna original.
- [ ] Verificar se o problema ocorre antes do optimistic update, durante o
      `DragOverlay` drop animation ou apos invalidacao/refetch.
- [x] Ajustar `DragOverlay`/drop animation para evitar "snap back" quando a
      mutacao e aceita.
- [x] Preservar rollback visual quando o backend rejeitar a movimentacao.
- [x] Garantir que o ajuste nao quebra overflow horizontal do Board.

### 7. Bug de Clique Bloqueado

- [ ] Tentar reproduzir com devtools: inspecionar elemento no canto superior
      esquerdo quando a regiao nao clicar.
- [ ] Verificar se algum `DialogOverlay`, elemento `body`, header, sidebar,
      drag overlay ou camada invisivel fica com `pointer-events` ativo depois de
      fechar modal/drag.
- [ ] Auditar componentes com `fixed`, `absolute`, `z-index`, `inset-0` e
      overlays sem desmontagem.
- [ ] Se reproduzido, adicionar fix pequeno no componente causador. Se nao for
      reproduzido, manter nota de investigacao e nao alterar layout global.

### 8. Mudancas de Arquitetura

- [x] Sprint deve deixar de pedir nome manual no frontend.
- [x] Backend deve gerar nome/indice automaticamente por projeto, em formato
      exibivel `Sprint 01`, `Sprint 02`, `Sprint 03`, ...
- [x] Decidir se o banco mantem coluna `nome` como campo derivado/compatibilidade
      ou se uma coluna `indice` deve ser adicionada em migracao futura.
- [x] Atualizar exibicao em Board, historico e dialogos para usar indice
      canonico.
- [x] Remover `due_date` de formularios de card ou bloquear seu uso para novos
      fluxos, depois de definir prazo no nivel da sprint.
- [x] Adicionar prazo da sprint se o produto confirmar que sprint precisa de
      data final planejada, mesmo que Sprint 2 tenha evitado datas em sprint
      planejada.
- [x] Migrar badges de prazo do card para calculo baseado na sprint ativa.
- [x] Revisar `JustificativaPrazo`: pode deixar de fazer sentido por card e
      virar justificativa de prazo da sprint.
- [x] Salvar snapshot independente dos cards no encerramento da sprint para
      historico nao depender dos cards movidos depois.

### 9. Qualidade Minima

- [ ] Criar testes backend para validacao QA: permissao, aprovado, reprovado e
      historico.
- [ ] Criar testes backend para remocao/rebaixamento de gerente e desatribuicao
      de cards.
- [ ] Criar testes frontend ou smoke manual documentado para modal QA, bug de
      reprovacao, comentarios, checklist e historico.
- [x] Criar testes leves para regras de backlog/sprint e badge de atraso sem
      exigir fixtures complexas.
- [x] Rodar `python manage.py check`.
- [x] Rodar testes backend disponiveis.
- [x] Rodar `npm run typecheck`, `npm run lint` e `npm run build`.
- [x] Atualizar documentacao apos implementacao.

## Contratos Esperados

### Validacao QA

- `GET /api/cards/<id>/validacao/`: lista validacoes com `resultado`,
  `observacao`, `qa_id`, `qa_nome` e `criado_em`.
- `POST /api/cards/<id>/validacao/`: aceita `resultado` (`APROVADO` ou
  `REPROVADO`) e `observacao`; permitido para `QA` e admin.
- Validacao deve registrar historico e notificar responsavel quando houver.

### Bugs

- `POST /api/projetos/<id>/cards/`: aceita `tipo=BUG`,
  `passos_reproducao`, `resultado_esperado` e `card_origem_id`.
- `GET /api/cards/<id>/`: deve retornar campos de BUG para o modal exibir.
- Bug criado a partir de reprovacao deve manter rastreabilidade para o card
  original.

### Historico do Card

- `GET /api/cards/<id>/historico/`: fonte de verdade para a aba/linha de
  atividade no detalhe do card.
- Movimentos, troca de responsavel, validacao QA, impedimento e criacao devem
  aparecer em ordem cronologica.

### Reatividade

- Board continua usando short polling e optimistic update.
- Telas de projetos/sprints/membros/backlog devem atualizar por invalidacao e,
  quando necessario, polling leve ou refetch ao focar janela.
- Nao usar WebSocket para esta etapa.

## Pontos a Esclarecer

1. A coluna de QA deve se chamar `Review` ou `Validação`?
2. Quem pode mover card para QA: responsavel, gerente, qualquer DEV/QA ou regra
   por coluna?
3. Depois de reprovar, o card original volta para `To do`/`In Progress` ou fica
   em QA enquanto o bug e resolvido?
4. Bug gerado por QA deve entrar na sprint ativa automaticamente ou no backlog?
5. Ao aprovar em QA, o card vai automaticamente para `Done` ou QA apenas registra
   aprovacao e alguem move depois?
6. Evidencias de bug/anexos sao obrigatorias para Sprint 3 ou apenas desejaveis?
7. Sprint indexada exige migracao de dados existentes ou basta gerar nomes
   futuros e normalizar exibicao?
8. A critica de prazo por sprint implica reintroduzir `data_fim` planejada na
   sprint, contrariando a regra anterior de sprint planejada sem datas?
9. A justificativa de prazo deve migrar de card para sprint ou sair do escopo
   desta entrega?
10. Auto update deve ser polling em todas as telas ou apenas refetch ao focar
    janela/invalidate apos mutacao?

## Estado Atual

- A validacao QA ficou restrita na interface ao card em `Review`, com a area de
  detalhe exibindo o rotulo `Validação`.
- Comentarios agora podem ser removidos pela interface e suportam mencoes e
  anexos.
- Cards em backlog continuam como sugestoes e nao liberam dados de execucao,
  comentarios, checklist, anexos ou validacao.
- Sprints encerradas passam a ter snapshot proprio no historico, para que a
  visualizacao de uma sprint antiga nao dependa do estado corrente dos cards.

## Riscos

- A regra de QA pode ficar inconsistente se `Review` e
  `COLUNA_VALIDACAO_NOME` nao forem alinhados.
- Remover prazo individual de card afeta UI, backend, historico,
  justificativas, badges e documentos. Tratar como migracao de dominio, nao
  ajuste visual simples.
- Polling em muitas telas pode gerar requests desnecessarios. Preferir polling
  curto apenas onde o dado muda em colaboracao real.
- DnD sem rollback pode esconder falhas de permissao. O ajuste visual nao deve
  remover o fallback quando a API rejeita.
- O bug de clique bloqueado e intermitente. Alteracao sem reproducao pode criar
  regressao de layout.

## Ordem Recomendada

1. Alinhar decisoes de QA e prazos com o usuario.
2. Implementar historico real no modal do card, pois ele apoia QA, comentarios e
   auditoria.
3. Implementar UI de validacao QA usando endpoint existente.
4. Implementar criacao de bug a partir de reprovacao.
5. Consolidar permissoes de transicao por coluna/cargo.
6. Ajustar reatividade das telas confirmadas como defasadas.
7. Ajustar animacao de drag-and-drop.
8. Planejar/migrar sprint indexada e prazo por sprint.
9. Fechar com testes e atualizacao de documentacao.

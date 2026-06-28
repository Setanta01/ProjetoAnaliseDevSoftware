# Sprint 3: Escopo e Interpretacao

## Objetivo da Sprint 3 no PDF

A Sprint 3 do `Documento de Priorização.pdf` e chamada de **Controle de
Qualidade (QA), Refinamento e Colaboracao**. Ela parte do fluxo principal ja
funcionando e introduz:

| Grupo | Historias | Leitura pratica |
| --- | --- | --- |
| Controle de Qualidade e Bugs | US29, US30, US31, US32 | Enviar cards para validacao, registrar aprovacao/reprovacao de QA e criar bugs com detalhes de reproducao. |
| Administracao e Permissoes | US10, US12, US13 | Refinar quem pode mover cards, remover DEV/QA e desvincular gerente sem deixar projeto sem gerente. |
| Organizacao e Colaboracao | US15, US18, US23, US28 | Prioridade, historico de sprints, subtarefas/checklists e comentarios no card. |

## Estado Atual Verificado

### Ja implementado ou quase completo

- **US12/US13 - Membros e gerentes:** backend e frontend ja permitem remover
  membros, alterar cargo e impedem remover/rebaixar o ultimo `GERENTE`.
  Quando um membro removido tinha cards atribuidos, o backend desatribui esses
  cards.
- **US15 - Prioridade:** cards possuem `prioridade`; criacao/edicao e Board
  exibem prioridade. O Board ordena cards por prioridade antes da data de
  criacao.
- **US18 - Historico de sprints:** `SprintHistoryView` lista sprints
  encerradas e o backend retorna `total_cards`, `concluidos` e `progresso`.
- **US23 - Checklists:** backend possui rotas para checklists e itens. O modal
  de card permite criar item e marcar como concluido.
- **US28 - Comentarios:** backend possui comentarios, edicao/remocao,
  notificacao por e-mail e flag contextual. O modal de card lista e cria
  comentarios.
- **US31/US32 - Bugs basicos:** card aceita `tipo=BUG`,
  `passos_reproducao`, `resultado_esperado` e `card_origem_id` no backend.
  O frontend cria BUG, mostra passos de reproducao, resultado esperado e
  origem quando existem.
- **Historico do card:** o modal usa `GET /cards/<id>/historico/` e exibe uma
  aba de historico real junto das validacoes QA.
- **Sprint indexada:** a criacao de sprint no frontend deixou de pedir nome
  manual; o backend gera nome sequencial quando `nome` nao e enviado.

### Parcialmente implementado

- **US29 - Transicao para validacao:** existe coluna `Review`, badge
  `aguardando_qa` e regra alinhada com a interface para liberar a acao de
  validacao apenas nessa etapa.
- **US30 - Registro de teste:** backend tem modelo e endpoint
  `GET|POST /cards/<id>/validacao/`, grava historico e notifica responsavel.
  O modal do card permite QA/admin aprovar ou reprovar, exige observacao para
  reprovacao e mostra a ultima validacao.
- **US31/US32 - Bugs completos:** a estrutura existe e a area de QA ja cria
  bug vinculado ao card original. O fluxo de anexos e evidencias segue
  parcial, mas comentarios agora aceitam anexos com preview de imagem.
- **US10 - Permissoes de transicao:** backend tem `PermissaoColuna` no modelo
  e uma regra hardcoded parcial. O Board permite gerente/admin ou responsavel
  mover cards. Falta consolidar uma regra unica por cargo/coluna e refletir isso
  no frontend sem depender apenas de `canManage` ou responsavel.
- **Anexos:** backend tem upload/remocao de anexos em card e comentario, e o
  frontend ja lista anexos de comentario com abertura direta e preview de
  imagem. O fluxo de anexos em nivel de card ainda nao aparece na interface.

### Nao implementado ou nao verificavel pela UI atual

- UI para anexos de bug/evidencias.
- Confirmacao visual/teste para a regra exata de transicao para validacao.
- Testes automatizados focados nos fluxos da Sprint 3.

## Itens Adicionais do Usuario

1. **Inconsistencia de auto update:** Board tem `refetchInterval: 5000`; telas
   de projetos e sprints dependem principalmente de invalidacao apos mutacoes.
   Deve-se verificar se `MyProjectsView`, `AdminProjectsView`,
   `SprintHistoryView`, `ProjectMembersView`, `BacklogView` e modais ficam
   defasados sem troca de pagina.
2. **Animacao de drag-and-drop:** movimento otimista existe, mas a animacao
   pode parecer voltar para a coluna original antes de aparecer no destino. O
   `DragOverlay` foi configurado sem animacao de queda para evitar o snap-back,
   mantendo rollback via cache anterior quando a API rejeita.
3. **Regiao superior esquerda sem clique:** nao foi reproduzido. Deve entrar
   como bug investigativo, com foco em overlays/dialogs, `body`, z-index e
   elementos invisiveis bloqueando pointer events.
4. **Criticas de arquitetura:**
   - Sprint nao deve ter nome manual; deve ser exibida por indice `01`, `02`,
     `03`, ... Ja foi aplicado para novas sprints sem migracao de dados antigos.
   - Card nao deve ter prazo individual; o prazo do card deve ser o prazo da
     sprint a qual pertence.

## Interpretacao para Esta Sprint

- O foco principal deve ser completar o ciclo QA: card entra em validacao, QA
  aprova/reprova, reprovacao pode gerar bug rastreavel, e historico/comentarios
  documentam a decisao.
- Nao criar um subsistema paralelo de QA. Reaproveitar o modal de card, rotas
  existentes e historico ja modelado.
- As criticas de sprint indexada e prazo por sprint alteram base de dominio e
  devem ser planejadas como migracoes pequenas, com compatibilidade para dados
  existentes.
- Como o Board ja usa short polling, qualquer tela que apresenta dados
  compartilhados deve ter uma politica explicita de refresh ou invalidacao
  equivalente, sem WebSocket.

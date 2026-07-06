# Detalhes de Implementacao

Este documento centraliza detalhes operacionais e de baixo nivel que mudam com
mais frequencia do que a arquitetura geral. Ele serve como referencia rapida
para gatilhos, intervalos e contratos praticos de funcionamento.

## E-mails

O backend atualmente agenda e-mails para estes eventos:

- Login com MFA por e-mail, quando o usuario tem `mfa_tipo == 'EMAIL'`.
- Recuperacao de senha.
- Confirmacao de alteracao de senha.
- Criacao de convite.
- Reenvio de convite valido.
- Configuracao de MFA por e-mail.
- Reenvio de codigo MFA por e-mail.
- Atribuicao de responsavel a um card.
- Novo comentario em um card, notificando responsavel e participantes previos.
- Mencao explicita de usuario em comentario, notificando o usuario mencionado.
- Comentario com mencao usa os membros do proprio projeto como universo de busca.
- Card liberado para Planning Poker.
- Validacao QA.
- Registro de impedimento.
- Remocao de membro do projeto quando o membro tinha cards atribuídos.

Todos esses fluxos escrevem jobs em `email_fila` e o worker de e-mail faz a
entrega fora da request HTTP.

## Polling

As telas do frontend usam polling leve com os seguintes intervalos atuais:

- `BoardView`: `5s`
- `BacklogView`: `10s`
- `SprintHistoryView`: `15s`
- `MyProjectsView`: `30s`
- `AdminProjectsView`: `30s`
- `ProjectMembersView`: `30s` para membros e `60s` para usuarios

O board continua sendo a tela mais frequente. As demais usam polling leve para
evitar desatualizacao visual entre mutacoes e troca de abas.

## Observacoes

- Estes detalhes devem ser atualizados quando uma tela passar a usar
  invalidacoes diretas em vez de polling, ou quando um novo fluxo passar a gerar
  notificacoes por e-mail.
- O documento de arquitetura deve permanecer em nivel mais estavel, sem listar
  frequencias exatas ou gatilhos operacionais.
- Comentarios, validacao QA, anexos e checklist nao ficam disponiveis para
  edicao em cards no backlog; eles passam a valer apenas quando o card entra em
  uma sprint.
- Mencoes em comentarios sao persistidas em `comentarios_mencoes` para que a
  indicacao visual continue aparecendo apos reload/polling.
- Impedimento de card pode ser marcado ou removido apenas por gerente/admin ou
  pelo responsavel atual do card.

## Anexos em Cards e Comentarios

Cards aceitam anexos enviados por `POST /api/cards/<id>/anexos/`.
Comentarios aceitam anexos enviados por `POST /api/cards/comentarios/<id>/anexos/`.
Os tipos aceitos atualmente sao:

- imagens (`image/jpeg`, `image/png`, `image/gif`, `image/webp`)
- videos (`video/*`)
- PDF (`application/pdf`)
- texto simples ou Markdown (`text/plain`, `text/markdown`)
- documentos Word (`.doc`, `.docx`)

O tamanho maximo aceito por anexo e de `65 MB`.

Quando o payload nao informa uma `url`, o backend salva o arquivo recebido em
`MEDIA_ROOT/anexos` e retorna a URL publica gerada pelo storage configurado. No
ambiente local, `MEDIA_ROOT` aponta para `backend/media` e os arquivos sao
servidos em `MEDIA_URL` (`/media/`) enquanto `DEBUG=True`.

Ao remover um anexo cuja URL aponta para `MEDIA_URL`, a view remove tambem o
arquivo fisico do storage local. URLs externas continuam sendo tratadas apenas
como metadado e a remocao exclui somente o registro do banco.

Na interface atual, anexos de comentario podem ser abertos diretamente e
imagens exibem uma miniatura inline. O card usa `projeto_id` no payload para
carregar apenas os membros do projeto no seletor de mencoes, evitando depender
de listagem global de usuarios.

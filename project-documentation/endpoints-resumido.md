# Contrato de API - Lazuli - v2

**Base URL:** `/api/`

**Autenticação:** `Authorization: Bearer <access_token>` em todas as rotas protegidas.

## Legenda de Permissões

| Tag        | Significado                                     |
| ---------- | ----------------------------------------------- |
| `[PUB]`    | Público (sem autenticação)                      |
| `[AUTH]`   | Qualquer utilizador autenticado                 |
| `[USER]`   | Apenas o próprio utilizador                     |
| `[ADMIN]`  | Admin do Sistema                                |
| `[GER]`    | Gerente do projeto                              |
| `[DEV]`    | Dev do projeto                                  |
| `[QA]`     | QA do projeto                                   |
| `[MEMBRO]` | Qualquer membro do projeto (Gerente, Dev ou QA) |

## 1. Autenticação e Conta

| Método | Rota                           | Perm.    | Descrição e Payload                                                                                             |
| ------ | ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/auth/bootstrap-status/`      | `[PUB]`  | Retorna `bootstrap_disponivel=true` somente enquanto nenhuma conta existir.                                    |
| `POST` | `/auth/bootstrap-admin/`       | `[PUB]`  | **Payload:** `nome`, `email`, `senha`, `confirmar_senha`. Cria atomicamente o primeiro administrador e fica permanentemente indisponível após a primeira conta. |
| `POST` | `/auth/login/`                 | `[PUB]`  | **Payload:** `email`, `senha`. Retorna JWT completo. Se MFA ativo, retorna `mfa_required: true` e `mfa_token`. |
| `POST` | `/auth/google/`                | `[PUB]`  | Autentica via Google OAuth e regista o utilizador no primeiro acesso.                                           |
| `POST` | `/token/`                      | `[PUB]`  | Obtém par Access/Refresh Token (SimpleJWT).                                                                     |
| `POST` | `/token/refresh/`              | `[PUB]`  | Renova o Access Token usando o Refresh Token.                                                                   |
| `POST` | `/auth/logout/`                | `[AUTH]` | Invalida o token atual (revogado).                                                                              |
| `POST` | `/auth/ativar-convite/`        | `[PUB]`  | **Payload:** `token`, `senha`, `confirmar_senha`. Ativa conta via convite.                                      |
| `POST` | `/auth/recuperar-senha/`       | `[PUB]`  | **Payload:** `email`. Dispara e-mail com link de recuperação.                                                   |
| `POST` | `/auth/redefinir-senha/`       | `[PUB]`  | **Payload:** `token`, `nova_senha`. Atualiza a password.                                                        |
| `GET`  | `/auth/profile/`               | `[AUTH]` | Retorna dados do utilizador logado, flag admin e status MFA.                                                    |
| `PUT`  | `/auth/profile/`               | `[USER]` | Atualiza dados básicos do próprio perfil (ex: nome).                                                            |
| `POST` | `/auth/profile/alterar-senha/` | `[USER]` | **Payload:** `senha_atual`, `nova_senha`, `confirmar_senha`.                                                    |

## 2. Multi-Factor Authentication (MFA)

| Método | Rota                 | Perm.    | Descrição e Payload                                                 |
| ------ | -------------------- | -------- | ------------------------------------------------------------------- |
| `GET`  | `/mfa/status/`       | `[AUTH]` | Retorna status e tipo de MFA do utilizador logado.                  |
| `POST` | `/mfa/challenge/`    | `[PUB]`  | **Payload:** `token_temp`, código OTP/TOTP. Devolve JWT definitivo. |
| `POST` | `/mfa/resend-email/` | `[PUB]`  | **Payload:** `token_temp`. Reenvia código OTP para o e-mail.        |
| `DELETE` | `/mfa/disable/`      | `[AUTH]` | **Payload:** `password`. Desativa MFA do utilizador.                   |
| `POST` | `/mfa/setup/totp/`   | `[AUTH]` | Inicia config TOTP. Retorna `secret` e URI para QR Code.            |
| `POST` | `/mfa/verify/totp/`  | `[AUTH]` | Confirma config TOTP com o primeiro código gerado.                  |
| `POST` | `/mfa/setup/email/`  | `[AUTH]` | Inicia config MFA por e-mail (envia OTP).                           |
| `POST` | `/mfa/verify/email/` | `[AUTH]` | Confirma config MFA por e-mail com OTP recebido.                    |

## 3. Administração Global

| Método  | Rota                    | Perm.     | Descrição e Payload                                                  |
| ------- | ----------------------- | --------- | -------------------------------------------------------------------- |
| `POST`  | `/admin/convites/`      | `[ADMIN]` | **Payload:** `email`, `admin` (boolean). Gera token e agenda o convite por e-mail. |
| `POST`  | `/admin/convites/<id>/reenviar/` | `[ADMIN]` | Agenda novamente o e-mail de um convite pendente e não expirado. |
| `GET`   | `/admin/usuarios/`      | `[ADMIN]` | Lista utilizadores do sistema, flags admin e status.                 |
| `PATCH` | `/admin/usuarios/<id>/` | `[ADMIN]` | Ativa/desativa utilizador ou altera flag `admin`.                    |
| `GET`   | `/admin/stats/`         | `[ADMIN]` | Retorna métricas globais (utilizadores, projetos, cards).            |
| `GET`   | `/usuarios/`            | `[AUTH]`  | Lista usuários ativos para seleção em membros de projeto.            |

## 4. Projetos e Membros

| Método      | Rota                                | Perm.         | Descrição e Payload                                                                               |
| ----------- | ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `GET`       | `/projetos/`                        | `[AUTH]`      | Lista projetos onde o utilizador é membro.                                                        |
| `GET`       | `/admin/projetos/`                  | `[ADMIN]`     | Lista todos os projetos da organização.                                                           |
| `POST`      | `/admin/projetos/`                  | `[ADMIN]`     | **Payload:** `nome`, `descricao`, `gerente_id`. Cria projeto, vincula colunas Kanban padrão e adiciona o gerente inicial. |
| `GET`       | `/projetos/<id>/`                   | `[MEMBRO]`    | Retorna detalhes do projeto, membros e sprints ativas.                                            |
| `PUT/PATCH` | `/projetos/<id>/`                   | `[ADMIN/GER]` | Atualiza dados ou arquiva projeto.                                                                |
| `DELETE`    | `/admin/projetos/<id>/`             | `[ADMIN]`     | Soft delete do projeto (exige dupla confirmação).                                                 |
| `GET`       | `/projetos/<id>/membros/`           | `[MEMBRO]`    | Lista membros e os respetivos cargos (`GERENTE`, `DEV`, `QA`).                                    |
| `POST`      | `/projetos/<id>/membros/`           | `[ADMIN/GER]` | **Payload:** `usuario_id`, `cargo`. Adiciona membro.                                              |
| `PATCH`     | `/projetos/<id>/membros/<user_id>/` | `[ADMIN/GER]` | **Payload:** `cargo`. Altera cargo do membro no projeto.                                          |
| `DELETE`    | `/projetos/<id>/membros/<user_id>/` | `[ADMIN/GER]` | Remove membro. Cards perdem responsável e gerentes são notificados.                               |
| `GET`       | `/projetos/<id>/colunas/`           | `[MEMBRO]`    | Lista colunas fixas do Kanban. _Nota: Apenas QA/GERENTE pode mover cards para fora de Validação._ |

## 5. Sprints e Backlog

| Método | Rota                      | Perm.      | Descrição e Payload                                                                                          |
| ------ | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/projetos/<id>/backlog/` | `[MEMBRO]` | Lista cards sem sprint, ordenados por prioridade.                                                            |
| `GET`  | `/projetos/<id>/sprints/` | `[MEMBRO]` | Lista histórico, ativa e planeada do projeto.                                                                |
| `POST` | `/projetos/<id>/sprints/` | `[GER]`    | **Payload opcional:** `nome`. Mantido por compatibilidade; a UI não cria mais sprint planejada manualmente. |
| `POST` | `/sprints/<id>/iniciar/`  | `[GER]`    | Inicia sprint (status → ATIVA). Se houver cards pendentes na última sprint encerrada do projeto, eles migram para `To do`. |
| `GET`  | `/sprints/<id>/`          | `[MEMBRO]` | Retorna árvore completa da sprint ativa. Para sprint encerrada com snapshot, retorna a lista histórica de cards capturada no encerramento. |
| `POST` | `/sprints/<id>/encerrar/` | `[GER]`    | **Payload:** `acao` (`iniciar_planejada` ou `pausar`), `cards_para_backlog`, `cards_para_sprint`. Se iniciar próxima sem `proxima_sprint_id`, o backend cria a próxima sprint automaticamente. |

## 6. Cards (Tarefas e Bugs)

### CRUD e Movimentação

| Método   | Rota                        | Perm.      | Descrição e Payload                                                                                                                                                               |
| -------- | --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/projetos/<id>/cards/`     | `[GER/QA]` | **Payload:** `titulo`, `tipo` (TAREFA/BUG), `sprint_id`, `prioridade`, `responsavel_id`, `due_date`, `criterios_aceitacao`, `estimativa_consolidada`, `pronto_para_estimativa`. QA pode criar apenas `BUG`. Sem `sprint_id`, o card fica no backlog como sugestão e não aceita responsável, prazo ou estimativa. Para entrega na sprint atual, enviar `due_date="SPRINT_ATUAL"` ou `entrega_na_sprint=true`. Se BUG, aceita `passos_reproducao`, `resultado_esperado` e `card_origem_id`. |
| `GET`    | `/cards/`                   | `[MEMBRO]` | Lista geral de cards. Aceita query param `?responsavel=me` para filtrar próprias tarefas.                                                                                         |
| `GET`    | `/cards/<id>/`              | `[MEMBRO]` | Detalhes completos do card.                                                                                                                                                       |
| `PATCH`  | `/cards/<id>/`              | `[MEMBRO]` | Atualiza campos, move `coluna_id` ou altera responsável. Gerente edita cards gerais; QA pode editar BUG. `sprint_id=null` move para backlog e limpa dados específicos da sprint. Cards no backlog só aceitam dados de sugestão; responsável, prazo, estimativa e coluna são bloqueados até entrar em sprint. `due_date="SPRINT_ATUAL"` atrela entrega à sprint atual; `due_date=null` remove esse vínculo. |
| `DELETE` | `/cards/<id>/`              | `[GER]`    | Remove o card.                                                                                                                                                                    |
| `GET`    | `/cards/<id>/historico/`    | `[MEMBRO]` | Lista registos de auditoria (mudança de coluna, responsável, etc).                                                                                                                |
| `POST`   | `/cards/<id>/marcar-visto/` | `[MEMBRO]` | Regista leitura e limpa flags visuais de novidade para o utilizador.                                                                                                              |

### Estimativas (Planning Poker)

| Método | Rota                               | Perm.      | Descrição e Payload                                                         |
| ------ | ---------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `POST` | `/cards/<id>/estimativas/enviar/`  | `[GER]`    | Marca card para estimativa e notifica membros.                              |
| `POST` | `/cards/<id>/estimativas/`         | `[DEV/QA]` | **Payload:** `valor` (`1`, `2`, `3`, `5`, `8`, `13`, `21` ou `?`). Submete voto secreto. |
| `POST` | `/cards/<id>/estimativas/revelar/` | `[GER]`    | **Payload:** `estimativa_consolidada`. Revela todos os votos e salva final. |
| `GET`  | `/cards/<id>/estimativas/`         | `[MEMBRO]` | Retorna votos (apenas o próprio antes da revelação, todos após).            |

### Estruturas Internas (Checklists, Vínculos, Comentários e Anexos)

| Método      | Rota                              | Perm.        | Descrição e Payload                                                |
| ----------- | --------------------------------- | ------------ | ------------------------------------------------------------------ |
| `GET/POST`  | `/cards/<id>/checklists/`         | `[MEMBRO]`   | Lista ou cria checklist no card.                                   |
| `PATCH/DEL` | `/cards/checklists/<id>/`         | `[MEMBRO]`   | Atualiza título/posição ou remove checklist inteiro.               |
| `POST`      | `/cards/checklists/<id>/itens/`   | `[MEMBRO]`   | Adiciona item ao checklist.                                        |
| `PATCH/DEL` | `/cards/checklists/itens/<id>/`   | `[MEMBRO]`   | Marca concluído/pendente, edita texto ou remove item.              |
| `GET`       | `/cards/<id>/vinculos/`           | `[MEMBRO]`   | Lista vínculos do card.                                            |
| `POST`      | `/cards/<id>/vinculos/`           | `[GER]`      | **Payload:** `card_destino_id`, `tipo_vinculo`.                    |
| `DELETE`    | `/cards/vinculos/<id>/`           | `[GER]`      | Remove o vínculo.                                                  |
| `GET/POST`  | `/cards/<id>/comentarios/`        | `[MEMBRO]`   | Lista ou cria comentário. **POST:** `texto`, `mencionados_ids`. Notifica participantes e usuários mencionados. |
| `PATCH/DEL` | `/cards/comentarios/<id>/`        | `[USER/GER]` | Edita ou remove o próprio comentário (Gerente remove qualquer um). |
| `POST`      | `/cards/<id>/anexos/`             | `[MEMBRO]`   | Upload de ficheiro direto no card. Aceita imagem, vídeo, PDF e documento de texto, até 65 MB. |
| `POST`      | `/cards/comentarios/<id>/anexos/` | `[MEMBRO]`   | Anexa imagem, vídeo, PDF ou documento de texto num comentário específico, até 65 MB. |
| `DELETE`    | `/cards/anexos/<id>/`             | `[USER/GER]` | Remove anexo.                                                      |

### Validação QA e Impedimentos

| Método   | Rota                       | Perm.      | Descrição e Payload                                                            |
| -------- | -------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `POST`   | `/cards/<id>/validacao/`   | `[QA]`     | **Payload:** `resultado` (APROVADO/REPROVADO), `observacao`. QA regista teste; `observacao` é obrigatória para `REPROVADO`. |
| `GET`    | `/cards/<id>/validacao/`   | `[MEMBRO]` | Lista histórico de validações.                                                 |
| `POST`   | `/cards/<id>/impedimento/` | `[MEMBRO]` | **Payload:** `comentario`. Marca card como impedido.                           |
| `DELETE` | `/cards/<id>/impedimento/` | `[MEMBRO]` | Remove o impedimento do card.                                                  |

## 7. Mapeamento: Banco de Dados × Endpoints

| Tabela | Endpoints Principais |
|--------|----------------------|
| `usuarios` | `/auth/profile/`, `/admin/usuarios/` |
| `convites_sistema` | `/admin/convites/`, `/auth/ativar-convite/` |
| `sessoes` | `/auth/logout/`, `/token/refresh/` |
| `recuperacao_senha` | `/auth/recuperar-senha/`, `/auth/redefinir-senha/` |
| `projetos` | `/projetos/`, `/admin/projetos/` |
| `projeto_membros` | `/projetos/<id>/membros/` |
| `sprints` | `/projetos/<id>/sprints/`, `/sprints/<id>/` |
| `colunas_board` | `/projetos/<id>/colunas/` |
| `permissoes_coluna` | Controlado internamente no `PATCH /cards/<id>/` |
| `cards` | `/projetos/<id>/cards/`, `/cards/<id>/` |
| `card_vinculos` | `/cards/<id>/vinculos/` |
| `card_historico` | `/cards/<id>/historico/` |
| `justificativas_prazo` | Gerado automaticamente via `PATCH /cards/<id>/` |
| `checklists` + `checklist_itens` | `/cards/<id>/checklists/`, `/cards/checklists/itens/<id>/` |
| `estimativas` | `/cards/<id>/estimativas/` |
| `validacoes_qa` | `/cards/<id>/validacao/` |
| `comentarios` | `/cards/<id>/comentarios/` |
| `anexos` | `/cards/<id>/anexos/`, `/cards/comentarios/<id>/anexos/` |
| `notificacoes` | Consumido internamente para gerar flags no `GET /sprints/<id>/` e atualizado via `POST /cards/<id>/marcar-visto/` |

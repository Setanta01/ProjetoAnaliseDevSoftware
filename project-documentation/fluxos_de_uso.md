# Fluxos de Uso — Lazuli

Este documento detalha as principais jornadas de uso e os fluxos sistêmicos da aplicação, servindo como guia prático de como as Histórias de Usuário, os Endpoints e o Banco de Dados se interconectam. Detalhes operacionais mais mutáveis, como intervalos de refresh, ficam concentrados em `detalhes-de-implementacao.md`.

---

> **Notificacoes e E-mails:** O sistema não possui um "sininho" global na interface de usuário (UI). Alertas críticos, como atribuições diretas, falhas de validação de QA, convites, recuperação e menções em comentários, sao persistidos em fila e entregues por worker SMTP, sem bloquear requests da API.

## 1. Fluxo de Convite, Autenticação e Segurança

### Cenário 0: Primeiro Boot da Instalação
1. Enquanto não existir nenhuma conta, o frontend consulta `GET /api/auth/bootstrap-status/` e exibe uma rota pública e temporária para criação da primeira conta administrativa.
2. A criação chama `POST /api/auth/bootstrap-admin/`, inicializa o sistema de contas e encerra permanentemente o estado de primeiro boot.
3. Depois disso, não existe cadastro público livre: novos usuários entram apenas por convite enviado por um administrador.
4. A disponibilidade é decidida exclusivamente pelo backend; configuração do cliente não pode reabrir o cadastro inicial.

### Cenário 1: Entrada no Sistema
1. O **Administrador** acessa o painel de usuários e envia um convite (`POST /api/admin/convites/`) inserindo o e-mail de um novo colaborador.
2. O colaborador recebe um e-mail com um token único, entregue pelo worker SMTP. Ao acessar o link, ele define sua senha (`POST /api/auth/ativar-convite/`). O sistema cria o registro na tabela `usuarios` e invalida o convite.
3. Se o administrador tiver marcado a flag `admin=true` no convite, esse usuário terá privilégios globais em toda a aplicação.

### Cenário 2: Login com MFA (Multi-Factor Authentication)
1. O usuário tenta fazer login com as credenciais cadastradas (`POST /api/auth/login/`).
2. O backend valida a senha, mas, se o `mfa_ativo` estiver `true`, não devolve o JWT final imediatamente. Retorna um `mfa_token` (válido por 5 minutos) e o aviso `mfa_required: true`.
3. O usuário insere o código (TOTP ou OTP de e-mail) e chama o endpoint de desafio (`POST /api/auth/mfa/challenge/`). Somente então recebe o par de tokens JWT (`access` e `refresh`) para navegação.

### Cenário 3: Entrada e Navegação Principal
1. Após autenticar, qualquer usuário entra em **Meus Projetos**, que lista somente os projetos dos quais é membro.
2. O administrador possui também uma página global separada, **Projetos Admin**, para administrar todos os projetos, inclusive arquivamento ou exclusão. Essa página não substitui **Meus Projetos**.
3. Board, Backlog, membros e histórico de sprints são navegação contextual e só aparecem depois que o usuário seleciona um projeto.
4. Cargos de projeto não são administrados em uma ação global; são gerenciados dentro do projeto correspondente.
5. A barra lateral pode ser recolhida para liberar espaço horizontal ao Board, preservando ícones e acesso às rotas disponíveis.

---

## 2. Fluxo de Criação de Projeto e Estruturação

1. O **Administrador** cria um novo projeto (`POST /api/admin/projetos/`) selecionando um usuário existente como `GERENTE` inicial. O administrador criador não entra automaticamente no projeto; ele pode se selecionar como gerente ou indicar outra pessoa.
2. O sistema gera automaticamente as colunas fixas do Board: `To do`, `In Progress`, `Review`, `Done`. Essas colunas não são criadas manualmente por usuários.
3. O **Administrador (ou um Gerente já inserido)** vincula usuários existentes na plataforma ao projeto (`POST /api/projetos/<id>/membros/`), definindo papéis de nível de projeto: `GERENTE`, `DEV` ou `QA`.
4. Todo projeto deve manter ao menos um `GERENTE`.
5. **Papéis Contextuais:** Um usuário que atua como `DEV` no "Projeto A" pode atuar livremente como `GERENTE` no "Projeto B". As validações de autorização de operações de mutação validam o cargo apenas dentro do escopo do `<projeto_id>` acessado.

---

## 3. Fluxo de Planejamento (Sprints e Poker)

### Construção do Backlog
1. O **Gerente** cria as tarefas ou bugs iniciais no Backlog daquele projeto (`POST /api/projetos/<id>/cards/`). Nesta etapa entram apenas dados ainda independentes da sprint, como título, descrição, tipo e critérios de aceitação. Campos de execução como prioridade, responsável, deadline, checklists, comentarios, anexos e validação ficam para quando o card entrar em uma sprint.

### Preparação da Sprint
1. O **Gerente** abre uma sprint para o projeto (`POST /api/projetos/<id>/sprints/`). A interface não expõe mais uma tela separada de sprint planejada; o foco operacional fica na sprint ativa e no historico das encerradas.
2. O Gerente move cards do Backlog para dentro da Sprint. Ao fazer isso, o sistema abre o formulário do card com os dados já preenchidos e permite revisar informações específicas da sprint, como prioridade, titulo, descricao, criterios de aceitacao, responsavel, deadline e dificuldade/Planning Poker. O card entra sempre na coluna `To do`.

### Estimativa com Planning Poker
1. O time precisa estimar os pontos de esforço para uma tarefa. O Gerente aciona no card a opção `pronto_para_estimativa = true`.
2. Os membros do projeto (DEVs e QAs) enviam via formulário privado (`POST /api/cards/<id>/estimativas/`) as suas notas de Planning Poker usando a escala `1`, `2`, `3`, `5`, `8`, `13`, `21` ou `?`. **Os votos não ficam expostos à equipe até o encerramento do Poker.** Cada um só vê o seu próprio voto.
3. Caso mudem de ideia na calada do planejamento, um novo POST atualiza/sobrescreve a pontuação.
4. O Gerente (moderador do Poker) vê quem já votou, sem ver os valores privados, e pode acionar o fechamento da estimativa (`POST /api/cards/<id>/estimativas/revelar/`) mesmo se nem todos votaram. Todos os votos de `estimativas` mudam a propriedade de estado interno para `revelada = true`. O time agora visualiza os resultados no Card e o Gerente preenche o resultado consensual em `estimativa_consolidada`.

### Iniciando a Sprint
1. O Gerente inicia a Sprint (`POST /api/sprints/<id>/iniciar/`). A `data_inicio` do Banco passa a ser o instante em que esta chamada foi processada, e o `status` vai para `ATIVA`. A restrição sistêmica obriga a existir, no máximo, **1 ativa** por vez.

---

## 4. Fluxo de Execução (O Board Dinâmico)

> **Atualização de Interface:** O frontend usa invalidacao de cache e refetch seletivo para manter o board e as telas compartilhadas consistentes. Os detalhes de intervalo e politica de refresh ficam documentados em `detalhes-de-implementacao.md`.

### Executando Tarefas e Mutabilidade
1. O **Dev** arrasta o card para a coluna de andamento e a interface dispara em backgroud a alteração de status/coluna (`PATCH /api/cards/<id>/`). A alteração do responsavel pelo Card insere um log na timeline natural (`card_historico`).
2. O Dev preenche ou dá "check" em itens da sua lista de `checklists` dentro do card. Cada alteração dispara uma atualização isolada (`PATCH` em `/itens/<id>/`), permitindo acompanhamento simultâneo do time.
3. Para comunicação focada na tarefa, o Dev cria um novo comentário no card. Esta ação atualiza a data de ultima modificacao do card, dispara notificacoes por e-mail aos envolvidos (como os marcados ou o responsavel pela tarefa), e sinaliza aos outros membros uma novidade a ser lida.

### Gestão de Exceções de Prazo e Impedimentos
1. Quando uma entrega exige renegociação e uma nova data de vencimento (`due_date`) é proposta, a API intercepta a request e exige que no Payload haja obrigatoriamente a explicação `justificativa_prazo`. Sem o comentário, a modificação falha. O relato será gravado e anexado ao log da alteração.
2. Caso o Dev fique "blockado" por questões externas, ele aciona o modo de bloqueio (`POST /api/cards/<id>/impedimento/`), provendo o relato do porquê o Card travou. O Card piscará no Board e ficará em evidência, marcando a propriedade booleana como travado.

### Indicadores Visuais (Stamps/Flags)
No front-end, a visualização condensada (a face do card na coluna, antes de abrir os detalhes) possui stamps que traduzem campos lógicos em contexto visual útil, incluindo:
1. **Prioridade:** Indicadores com cores ou ícones mostrando prioridade Baixa, Média, Alta ou Urgente.
2. **Prazos:** Alertas dinâmicos baseados no `due_date`, exibindo selos visuais como "Atrasado" (vermelho) ou "Entrega em 24h" (laranja).
3. **Impedimentos:** Se marcado como impedido (`impedido = true`), o card exibe um ícone forte (ex: uma placa de pare ou coloração de destaque "Bloqueado"), sinalizando travamento ao Scrum Master/Gerente.
4. **Planning Poker Ativo:** Se a tarefa estiver com `pronto_para_estimativa = true` e ainda sem a `estimativa_consolidada`, é exibido um ícone de que o card "Aguardando Votações".
5. **Flags de Novidade:** Se `tem_novidade` for gerada pelo endpoint para esse usuário específico, o card mostrará uma insígnia sutil de "Novo Comentário/Alteração".

### Visualização Contextual e Badges
1. Para manter a contextualização da falta de sininho, o Payload do `GET /sprints/<id>/` avalia internamente a diferença de _timestamps_ entre a última interação do usuário (`last_viewed_at` virtualizada ou no card) e atualiza o JSON de entrega injetando flag booleana `tem_novidade: true`.
2. Ao clicar visualmente em cima do Card, o Frontend despacha imediatamente uma chamada a `POST /api/cards/<id>/marcar-visto/`.
3. No banco, os registros em `notificacoes` referentes àquele evento para o ID em uso mudam seu status para `lida = true` eliminando a flag da UI no instante da leitura.

---

## 5. Fluxo de Qualidade (QA e Validação)

1. A tarefa evolui, e o responsável empurra para a coluna sistêmica fixa de **Review**, exibida na interface como a area de **Validação** do card.
2. **A Trava Sistêmica do Processo:** O Frontend deve barrar e o Backend validar rigidamente. Uma vez na coluna de validacao, somente usuarios atrelados sob o papel de `QA` (ou o proprio dono geral do projeto `GERENTE`) dispõem da credencial de autorizacao para executar comandos de mudança que arrastem esse `card_id` para fora dessa coluna.
3. O QA toma o card, afere seu comportamento nas suas test suites e aciona (`POST /api/cards/<id>/validacao/`), chancelando o trabalho com um status estrito ENUM de `APROVADO` ou `REPROVADO`.
4. Caso validado como Negado (`REPROVADO`), ele recebe o sinal verde para arrastar fisicamente o Card de volta para as Colunas de andamento ou devidas correções ao Dev.
5. Em eventos catastróficos onde a "Tarefa" gerou uma pane isolada (Bug formal), o QA poderá criar um Card novo do tipo `tipo: BUG` (onde os payloads aceitam informações aprofundadas como Passos de Reprodução e Resultado Esperado), e no mesmo instante submetem à interface um Vínculo apontando para a "Tarefa X" (`POST /api/cards/<id>/vinculos/` com Tipo Vinculo de Natureza `BLOQUEIA`).

---

## 6. Fluxo de Encerramento e Limpeza

1. A Sprint alcança o seu horizonte natural de encerramento pratico.
2. O **Gerente** efetiva a conclusao (`POST /api/sprints/<id>/encerrar/`).
3. Imediatamente a API sela de maneira estatica a coluna de data e hora de fim (`data_fim`) e grava snapshot dos cards da sprint encerrada.
4. O payload escolhe `acao: "iniciar_planejada"` ou `acao: "pausar"`.
   - Em `iniciar_planejada`, o sistema inicia a proxima sprint cadastrada e move os cards pendentes informados em `cards_para_sprint`. Cards que estavam em `Review` permanecem em `Review`; os demais retornam para `To do`.
   - Em `pausar`, a sprint atual e encerrada sem iniciar uma nova imediatamente. Quando o projeto for retomado, uma nova sprint pode ser criada e iniciada sem perder o snapshot da sprint anterior.
   - `cards_para_backlog` contem cards que devem voltar ao estado frio do `Backlog`.
5. O historico de sprints deve permitir abrir sprints antigas e ver o estado congelado no encerramento, sem depender dos cards atuais do projeto.

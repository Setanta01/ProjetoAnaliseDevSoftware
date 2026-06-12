# Fluxos de Uso — Lazuli

Este documento detalha as principais jornadas de uso e os fluxos sistêmicos planejados para a aplicação, servindo como guia prático de como as Histórias de Usuário, os Endpoints e o Banco de Dados se interconectam. Além disso, descreve intenções técnicas para o Frontend e Backend (ex: estratégia de _fetching_, gerenciamento de estado) como referência para a equipe técnica.

---

> **Notificações e E-mails (Intenção Técnica):** O sistema não possui um "sininho" global na interface de usuário (UI). Alertas críticos (atribuições diretas, falhas de validação de QA, e-mails do sistema de convite e recuperação) disparam e-mails rapidamente via API da biblioteca **Resend**. Para manter a comunicação fluida no board e de forma contextualizada, o payload principal da Sprint injetará flags dinâmicas (`tem_novidade`, `novos_comentarios`) indicando atualizações não lidas no escopo daquele Card desde a última vez que o usuário visualizou.

## 1. Fluxo de Convite, Autenticação e Segurança

### Cenário 0: Primeiro Boot da Instalação
1. Enquanto não existir nenhuma conta, o frontend consulta `GET /api/auth/bootstrap-status/` e exibe uma rota pública e temporária para criação da primeira conta administrativa.
2. A criação chama `POST /api/auth/bootstrap-admin/`, inicializa o sistema de contas e encerra permanentemente o estado de primeiro boot.
3. Depois disso, não existe cadastro público livre: novos usuários entram apenas por convite enviado por um administrador.
4. A disponibilidade é decidida exclusivamente pelo backend; configuração do cliente não pode reabrir o cadastro inicial.

### Cenário 1: Entrada no Sistema
1. O **Administrador** acessa o painel de usuários e envia um convite (`POST /api/admin/convites/`) inserindo o e-mail de um novo colaborador.
2. O colaborador recebe um e-mail com um token único (enviado via Resend). Ao acessar o link, ele define sua senha (`POST /api/auth/ativar-convite/`). O sistema cria o registro na tabela `usuarios` e invalida o convite.
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

1. O **Administrador** cria um novo projeto (`POST /api/admin/projetos/`). O sistema gera automaticamente as `colunas_board` padronizadas e o projeto fica disponível na sua carteira de acompanhamento.
2. O **Administrador (ou um Gerente já inserido)** vincula usuários logados na plataforma ao projeto (`POST /api/projetos/<id>/membros/`), definindo papéis de nível de projeto: `GERENTE`, `DEV` ou `QA`.
3. **Papéis Contextuais:** Um usuário que atua como `DEV` no "Projeto A" pode atuar livremente como `GERENTE` no "Projeto B". As validações de autorização de operações de mutação validam o cargo apenas dentro do escopo do `<projeto_id>` acessado.

---

## 3. Fluxo de Planejamento (Sprints e Poker)

### Construção do Backlog
1. O **Gerente** cria as tarefas ou bugs iniciais no Backlog daquele projeto (`POST /api/projetos/<id>/cards/`).

### Preparação da Sprint
1. O **Gerente** cria uma sprint (`POST /api/projetos/<id>/sprints/`). Uma regra crucial de negócio: Sprints nascem como `PLANEJADA` e **não definem data de início ou de fim** durante o planejamento. O sistema não engessa datas futuras, respeitando Sprints que sofrem readequação de tamanho antes de entrarem em vigência.
2. O Gerente arrasta/move os cards do Backlog para dentro dessa Sprint `PLANEJADA`. Ao fazer isso, o sistema aloca o card de forma automática na primeira coluna do board, representando a fase inicial (ex: "To Do" ou equivalente, baseada na coluna de menor `posicao`).

### Estimativa com Planning Poker
1. O time precisa estimar os pontos de esforço para uma tarefa. O Gerente aciona no card a opção `pronto_para_estimativa = true`.
2. Aos membros do projeto (DEVs e QAs) enviam via formulário privado (`POST /api/cards/<id>/estimativas/`) as suas notas de Planning Poker. **Os votos não ficam expostos à equipe até o encerramento do Poker.** Cada um só vê o seu próprio voto.
3. Caso mudem de ideia na calada do planejamento, um novo POST atualiza/sobrescreve a pontuação.
4. O Gerente (moderador do Poker) aciona o fechamento da estimativa (`POST /api/cards/<id>/estimativas/revelar/`). Todos os votos de `estimativas` mudam a propriedade de estado interno para `revelada = true`. O time agora visualiza os resultados no Card e o Gerente acorda e preenche o resultado consensual em `estimativa_consolidada`.

### Iniciando a Sprint
1. O Gerente inicia a Sprint (`POST /api/sprints/<id>/iniciar/`). A `data_inicio` do Banco passa a ser o instante em que esta chamada foi processada, e o `status` vai para `ATIVA`. A restrição sistêmica obriga a existir, no máximo, **1 ativa** por vez.

---

## 4. Fluxo de Execução (O Board Dinâmico)

> **Intenção Técnica de Fetch (React Query):** Para fornecer uma visão ágil de Kanban com baixo overhead sem recair em WebSockets complexos, a estratégia será de *Short Polling*. O endpoint de Board da Sprint (`GET /api/sprints/<id>/`) retorna uma resposta *agregada*. Em uma única requisição a API deve fornecer os arrays de Colunas e todos os Cards (contendo junto checklists, votos de poker ativos, histórico rápido, tags). As Mutações (mover, editar, checklist) disparam pequenos POSTs granulares seguidos de invalidação do cache do React Query (`invalidateQueries`), atualizando o layout imediatamente. Devido ao tamanho das equipes (até 10 pessoas), essa operação otimizada supre amplamente a necessidade de desempenho.

### Executando Tarefas e Mutabilidade
1. O **Dev** arrasta o card para a coluna de andamento e a interface dispara em backgroud a alteração de status/coluna (`PATCH /api/cards/<id>/`). A alteração do responsável pelo Card insere um log na timeline natural (`card_historico`).
2. O Dev preenche ou dá "check" em itens da sua lista de `checklists` dentro do card. Cada alteração dispara uma atualização isolada (`PATCH` em `/itens/<id>/`), permitindo acompanhamento simultâneo do time.
3. Para comunicação focada na tarefa, o Dev cria um novo comentário no card. Esta ação atualiza a data de última modificação do card, dispara notificações por e-mail aos envolvidos (como os marcados ou o responsável pela tarefa), e sinaliza aos outros membros uma novidade a ser lida.

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

1. A tarefa evolui, e o responsável empurra para a coluna sistêmica fixa de **Validação / Revisão QA**.
2. **A Trava Sistêmica do Processo:** O Frontend deve barrar e o Backend validar rigidamente. Uma vez lá dentro, somente usuários atrelados sob o papel de `QA` (ou o próprio dono geral do projeto `GERENTE`) dispõem da credencial de autorização para executar comandos de mudança que arrastem esse `card_id` para Fora desta Coluna de Estado.
3. O QA toma o card, afere seu comportamento nas suas test suites e aciona (`POST /api/cards/<id>/validacao/`), chancelando o trabalho com um status estrito ENUM de `APROVADO` ou `REPROVADO`.
4. Caso validado como Negado (`REPROVADO`), ele recebe o sinal verde para arrastar fisicamente o Card de volta para as Colunas de andamento ou devidas correções ao Dev.
5. Em eventos catastróficos onde a "Tarefa" gerou uma pane isolada (Bug formal), o QA poderá criar um Card novo do tipo `tipo: BUG` (onde os payloads aceitam informações aprofundadas como Passos de Reprodução e Resultado Esperado), e no mesmo instante submetem à interface um Vínculo apontando para a "Tarefa X" (`POST /api/cards/<id>/vinculos/` com Tipo Vinculo de Natureza `BLOQUEIA`).

---

## 6. Fluxo de Encerramento e Limpeza

1. A Sprint alcança o seu horizonte natural de encerramento prático.
2. O **Gerente** efetiva a conclusão (`POST /api/sprints/<id>/encerrar/`).
3. Imediatamente a API sela de maneira estática a coluna de Data Hora de Fim (`data_fim`).
4. Porém o Ágil é mutável e as sobras ocorrem. Como não convém abandonar Cards para o limbo, a funcionalidade do endpoint abriga uma premissa obrigatória: o Payload enviará 2 Arrays declarando explicitamente a "Destinação dos Órfãos".
   - O array A conterá o ID dos cards que sofrem "regressão" e voltam ao estado frio do `Backlog`.
   - O array B alocará o ID dos cards perfeitamente apontados e passados ativamente para o ID numérico da `próxima_sprint`.
5. Em seguida a recém chegada `Próxima Sprint` inicia os trabalhos do Ciclo e vira `ATIVA`. O Fluxo retorna à normalidade e reinicia seu tráfego.

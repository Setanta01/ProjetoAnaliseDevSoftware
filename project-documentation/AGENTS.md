# OpenCode / AI Agent Instructions

## 🏗️ Architecture & Boundaries
- **Frontend (Scrap & Rebuild)**: O frontend atual será **completamente substituído**. Não tente refatorar ou reutilizar a lógica legada (ex: o estado monolítico em `App.tsx`). O novo frontend deve utilizar Vite, React Router, React Query (`@tanstack/react-query`), Tailwind CSS e `shadcn/ui`.
- **Backend & Banco de Dados**: Django REST Framework (DRF) + PostgreSQL. A base do backend será mantida, mas deve ser ajustada. `models.py`, `serializers.py` e `views.py` devem espelhar perfeitamente as definições do banco e dos endpoints.
- **Source of Truth (Crucial)**: Confie estritamente nos arquivos `fluxos_de_uso.md`, `Documento de Arquitetura de Software.md`, `endpoints-resumido.md` (ou `endpoints-novo.md`) e `schema.sql`. **O documento de Histórias de Usuário pode estar desatualizado**; utilize-o apenas como contexto secundário.

## 🛠️ Tech Stack Quirks & Workflow
- **Estratégia de Notificações**: NÃO crie componentes globais de "Sininho" na UI. Alertas críticos agendam e-mails na fila PostgreSQL do backend. As atualizações visuais no Board Kanban operam via injeção de flags booleanas contextuais (`tem_novidade`, `novos_comentarios`) diretamente no payload dos Cards. O Frontend limpa essas flags ao abrir o card chamando `POST /api/cards/<id>/marcar-visto/`.
- **React Query e Short Polling**: O Board não utiliza WebSockets. A renderização consome a rota agregada `GET /api/sprints/<id>/` via short polling leve e otimiza interações da interface com *Optimistic Updates*. Qualquer mutação (ex: arrastar card, marcar checklist) deve executar um request `PATCH/POST` granular e invocar `invalidateQueries` para reatividade imediata.
- **Regras de Negócio Inflexíveis**:
  - Sprints em planejamento (`PLANEJADA`) nascem **sem data de início ou fim**.
  - As colunas de um Kanban (ex: To Do, Doing, QA, Done) são **fixas** e geradas na criação do projeto.
  - Prazos: Alterar o prazo (`due_date`) de um card ativo obriga o envio de uma `justificativa_prazo` no payload.
  - Votos Ocultos: No Planning Poker (`/api/cards/<id>/estimativas/`), desenvolvedores e QAs não enxergam os votos uns dos outros até que o Gerente use o endpoint de revelação.
  - Trava de QA: Apenas membros com o cargo de `QA` ou `GERENTE` no projeto podem movimentar um Card para fora da coluna de Validação/QA. O backend DEVE barrar isso ativamente.
- **Autorização Contextual e Cargos**: A flag global `admin` dá poderes totais na plataforma, porém no fluxo principal os cargos (`GERENTE`, `DEV`, `QA`) existem estritamente dentro do escopo de um projeto (`projeto_membros`). Um usuário pode ser DEV em um projeto e GERENTE em outro. As validações nas rotas dependem desse contexto.
- **Envio de E-mail**: Fluxos da API apenas criam jobs em `email_fila`, usando `transaction.on_commit()` quando dependem de uma alteração no banco. O comando `python manage.py process_email_queue` entrega as mensagens fora do request através do backend SMTP do Django. Não faça chamadas SMTP diretamente nas views.

## 🚀 Common Commands
- **Backend (Setup e Execução)**:
  ```bash
  cd backend
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver
  ```
- **Frontend (Após o rebuild)**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

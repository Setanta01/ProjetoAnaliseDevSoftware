# Lazuli

Sistema acadêmico de gestão ágil com Django REST Framework, PostgreSQL,
React, TypeScript e Vite.

## Serviços locais

O ambiente de desenvolvimento usa quatro processos:

1. PostgreSQL: persiste usuários, projetos, cards, sessões e a fila de e-mail.
2. Django API: autenticação, regras de negócio e endpoints REST em
   `http://localhost:8000`.
3. Vite: frontend React em `http://localhost:5173`.
4. Worker de e-mail: processa `email_fila` e entrega mensagens via SMTP.

Cada desenvolvedor cria seu próprio banco e volume PostgreSQL local. Dados de
usuários não são versionados nem enviados ao Git; somente o schema inicial é
compartilhado.

## Pré-requisitos

- Python 3.13 ou versão compatível com `backend/requirements.txt`
- Node.js 24 ou versão compatível com `frontend/package.json`
- Podman ou Docker para PostgreSQL 16
- Git

## Primeiro setup

Crie o PostgreSQL local:

```bash
podman run -d \
  --name lazuli-postgres \
  --restart unless-stopped \
  -e POSTGRES_DB=lazuli \
  -e POSTGRES_USER=lazuli \
  -e POSTGRES_PASSWORD='<senha-local>' \
  -p 5432:5432 \
  -v lazuli-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

Importe o schema da aplicação:

```bash
podman exec -i lazuli-postgres \
  psql -v ON_ERROR_STOP=1 -U lazuli -d lazuli \
  < backend/api/migrations/sql/initial_schema.sql
```

Configure o backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
```

Preencha `backend/.env` com as credenciais do PostgreSQL. SMTP e Google OAuth
são opcionais para o login local por e-mail e senha.

Configure o frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Configure a URL do backend:

```env
VITE_API_URL=http://localhost:8000
```

### Setup no Windows (PowerShell)

Os mesmos passos funcionam no Windows usando PowerShell. Use Docker Desktop ou
Podman Desktop para o PostgreSQL.

Crie o PostgreSQL local:

```powershell
podman run -d `
  --name lazuli-postgres `
  --restart unless-stopped `
  -e POSTGRES_DB=lazuli `
  -e POSTGRES_USER=lazuli `
  -e POSTGRES_PASSWORD="<senha-local>" `
  -p 5432:5432 `
  -v lazuli-postgres-data:/var/lib/postgresql/data `
  docker.io/library/postgres:16-alpine
```

Se estiver usando Docker em vez de Podman, troque `podman` por `docker`.

Importe o schema da aplicação:

```powershell
Get-Content backend/api/migrations/sql/initial_schema.sql | podman exec -i lazuli-postgres psql -v ON_ERROR_STOP=1 -U lazuli -d lazuli
```

Configure o backend:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
```

Se o PowerShell bloquear a ativação do ambiente virtual, execute uma vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Configure o frontend:

```powershell
cd ..\frontend
npm install
Copy-Item .env.example .env.local
```

## Executar o projeto

Terminal 1, PostgreSQL:

```bash
podman start lazuli-postgres
```

Terminal 2, backend:

```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

Terminal 3, frontend:

```bash
cd frontend
npm run dev
```

Terminal 4, worker de e-mail:

```bash
cd backend
source .venv/bin/activate
python manage.py process_email_queue
```

O worker só é necessário para convites, recuperação de senha, MFA por e-mail e
outras notificações. Para processar apenas o lote disponível e encerrar, use
`python manage.py process_email_queue --once`.

No Windows, os comandos de execução são os mesmos, trocando a ativação do
ambiente virtual por:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Primeiro acesso

Com a tabela `usuarios` vazia, o frontend abre `/setup-admin`. O primeiro
administrador é criado uma única vez; depois disso, novos usuários entram por
convite enviado na área administrativa.

Para restaurar o banco local ao primeiro boot sem remover o container ou o
schema:

```bash
cd backend
source .venv/bin/activate
python manage.py wipe_db_state0 --dry-run
python manage.py wipe_db_state0
```

O comando apaga todos os dados locais, reinicia as sequences e preserva
`django_migrations`. Não execute contra um banco que precise ser preservado.

## Google OAuth

Login com Google usa o mesmo OAuth Client ID do tipo **Web application** em:

- `backend/.env`: `GOOGLE_CLIENT_ID`
- `frontend/.env.local`: `VITE_GOOGLE_CLIENT_ID`

No Google Cloud Console, registre como Authorized JavaScript origins:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Reinicie o Vite depois de alterar `.env.local`.

## E-mail SMTP

O backend agenda mensagens no PostgreSQL; requests HTTP não enviam SMTP
diretamente. Para Gmail, configure `backend/.env` com
`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, usuário, senha de
aplicativo e remetente. Sem credenciais reais, use o backend de console descrito
em `backend/.env.example`.

## Verificações

Backend:

```bash
cd backend
source .venv/bin/activate
python manage.py test api.tests
python manage.py check
```

No Windows, substitua `source .venv/bin/activate` por
`.\.venv\Scripts\Activate.ps1`.

Frontend:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Detalhes de ambiente, autenticação e e-mail estão em
`project-documentation/auth/LOCAL_SETUP_AND_AUTH_FLOW.md`. Segredos locais
devem permanecer em arquivos ignorados pelo Git.

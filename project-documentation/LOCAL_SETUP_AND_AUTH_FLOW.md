# Local Setup and Authentication Flow

## Local Services

Development uses three local processes:

1. PostgreSQL in the `lazuli-postgres` Podman container.
2. Django REST API on `http://localhost:8000`.
3. Vite frontend on `http://localhost:5173`.

Actual local credentials and provider identifiers are recorded in the ignored
`LOCAL_SECRETS.md` file. This tracked document intentionally contains no live
secrets.

`SECRET_KEY` is a Django signing secret used for security-sensitive values such
as temporary MFA tokens. It is not a database credential. Database access uses
the separate `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`
variables.

## Create PostgreSQL for the First Time

Choose a local password and use the same value in `backend/.env`:

```bash
podman run -d \
  --name lazuli-postgres \
  --restart unless-stopped \
  -e POSTGRES_DB=lazuli \
  -e POSTGRES_USER=lazuli \
  -e POSTGRES_PASSWORD='<local-password>' \
  -p 5432:5432 \
  -v lazuli-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

Wait until PostgreSQL is ready:

```bash
podman exec lazuli-postgres pg_isready -U lazuli -d lazuli
```

Import the application tables. This step is required because the application
models are unmanaged and normal Django migrations do not create them:

```bash
podman exec -i lazuli-postgres \
  psql -v ON_ERROR_STOP=1 -U lazuli -d lazuli \
  < backend/api/migrations/sql/initial_schema.sql
```

Then apply Django's framework migrations from `backend/`:

```bash
.venv/bin/python manage.py migrate
```

## Start PostgreSQL

```bash
podman start lazuli-postgres
```

The database data persists in the named volume `lazuli-postgres-data`.

Check the container:

```bash
podman ps --filter name=lazuli-postgres
```

## Start Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

`backend/.env` provides Django, PostgreSQL, Resend, Google OAuth, and frontend
URL settings. It is ignored by Git.

## Start Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` uses real-backend mode:

```env
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:8000
```

## First System Boot

1. The frontend calls `GET /api/auth/bootstrap-status/` before showing login.
2. If `usuarios` is empty, the frontend redirects to `/setup-admin`.
3. The form calls `POST /api/auth/bootstrap-admin/`.
4. The backend atomically creates the first active global administrator.
5. After any user exists, bootstrap is permanently unavailable and the normal
   login page is shown.

The first-administrator step does not send email. Resend is used after login
for invitations, password recovery, email MFA, and critical notifications.

## Invitation Registration

1. A logged-in global administrator creates an invitation.
2. The backend stores a one-use token and sends a Resend email containing
   `/ativar-convite?token=...`.
3. The invited user opens that route, validates the token, and chooses a
   password.
4. The backend creates or activates the account and consumes the invitation.
5. Project roles remain project-scoped and are assigned separately.

If Resend rejects an invitation email, the pending invitation is deleted so
the administrator can retry.

## Login and MFA

Password login calls `POST /api/auth/login/`. A normal login returns access and
refresh JWTs. Accounts with MFA enabled receive a temporary MFA token first.
Email MFA sends an OTP through Resend; TOTP uses the configured authenticator.

## Check Existing Users

```bash
cd backend
source .venv/bin/activate
python manage.py shell -c "from api.models import Usuario; print(Usuario.objects.count())"
```

Detailed counts:

```bash
python manage.py shell -c "from api.models import Usuario; print({'total': Usuario.objects.count(), 'ativos': Usuario.objects.filter(ativo=True).count(), 'admins': Usuario.objects.filter(admin=True).count()})"
```

## Reset to First Boot

This deletes application data. Use it only for local testing:

```bash
podman rm -f lazuli-postgres
podman volume rm lazuli-postgres-data
```

Then recreate the database container and import
`backend/api/migrations/sql/initial_schema.sql` before starting Django.

## Email Smoke Tests

After creating the first administrator:

1. Send an invitation to an address allowed by the current Resend account.
2. Confirm the email arrives and opens the local activation route.
3. Activate the user and test password login.
4. Enable email MFA and confirm OTP delivery.
5. Test password recovery after the corresponding frontend screens exist.

Automated tests mock provider delivery. These smoke tests verify the real
Resend credentials, sender domain, recipient policy, and generated URLs.

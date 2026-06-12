# Lazuli Frontend

## Demo mode

Demo mode allows the frontend to run without Django, Google OAuth, Resend, or a database.

Create `frontend/.env.local` with:

```env
VITE_DEMO_MODE=true
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and use **Explorar demonstração** on the login
page. The selected demo role and all
demo mutations are stored in browser local storage.

Available demo screens:

- Login, first-admin registration, and invited-user registration
- Member project list for Admin, Gerente, Dev, and QA
- Separate global project administration for Admin
- Project-scoped sprint board, backlog, members, and sprint history
- Task creation, card details, comments, subtasks, and planning poker
- MFA settings flow

Use the role selector in the top bar to test permissions. Project-specific
navigation is shown only after opening a project. Use **Resetar** to restore the
original fixtures.

## Real backend mode

Set the local environment to:

```env
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Demo mode is additionally guarded by `import.meta.env.DEV`, so production builds always use real authentication and API behavior.

The frontend reads `/api/auth/bootstrap-status/` to decide whether first-admin
setup is available. Normal users register only through an administrator
invitation.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

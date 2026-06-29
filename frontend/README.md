# Lazuli Frontend

## Local setup

Set the local environment to:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The frontend reads `/api/auth/bootstrap-status/` to decide whether first-admin
setup is available. Normal users register only through an administrator
invitation.

Run:

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

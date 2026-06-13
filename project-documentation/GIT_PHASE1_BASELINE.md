# Git Baseline Before Authentication and Email Stabilization

## Recorded State

Recorded on 2026-06-12 before changing application or email behavior.

- Local branch: `feature/frontend-design-system-refactor`
- Upstream branch: `origin/feature/frontend-design-system-refactor`
- Position: local branch is five commits ahead of upstream
- Strategy: preserve the useful authentication work and replace only the
  synchronous Resend-specific implementation in later feature packs

## Local Commits Not Yet on Upstream

1. `58ed169 feat(autenticacao): adicionar bootstrap do primeiro administrador`
2. `631fd06 fix(autenticacao): validar bootstrap e configurar links`
3. `3a05657 feat(autenticacao): integrar login convites e primeiro acesso`
4. `7831714 feat(autenticacao): integrar primeiro acesso e emails com Resend`
5. `f39bd2a docs(ambiente): documentar configuração local e fluxo de autenticação`

## Changes to Preserve

- Backend-controlled first-administrator bootstrap status and creation.
- PostgreSQL transaction advisory lock for concurrent bootstrap requests.
- Canonical login and authenticated-profile contracts.
- Access-token refresh and authenticated session restoration.
- Invitation information and activation integration.
- Frontend first-boot routing and backend-unavailable error state.
- Auth flow tests and local setup documentation that are not provider-specific.

## Changes to Replace Later

- Direct use of the Resend SDK.
- Synchronous provider network calls inside HTTP requests.
- Deleting pending invitations when immediate email delivery fails.
- Resend-specific settings, dependencies, documentation, and tests.

These changes will be replaced by the queued Gmail SMTP implementation in a
separate feature pack. They are intentionally not changed during Phase 1.

## Dirty Files at Baseline

- `.env.example`: sender-domain placeholder correction; belongs to Phase 1.
- `frontend/src/components/app/AppShell.tsx`: unrelated formatting-only changes;
  leave unstaged and exclude from feature commits.
- `frontend/src/components/app/Kanban.tsx`: unrelated formatting-only changes;
  leave unstaged and exclude from feature commits.
- `contexto_completo.txt`: pre-existing deletion; do not inspect, stage, restore,
  or include in commits.
- `project-documentation/AUTH_AND_EMAIL_STABILIZATION_PLAN.md`: Phase 1 planning
  document to track the approved stabilization work.

## Commit Boundaries

Use Portuguese semantic commit messages and keep these feature packs separate:

1. Phase 1 planning and Git baseline.
2. PostgreSQL email queue.
3. Gmail SMTP worker and email templates.
4. Login route and loading-state stabilization.
5. Administrator invitation interface and resend behavior.
6. Password recovery and reset interface.
7. Authentication and MFA integration verification.

Before each commit, stage files explicitly. Do not use broad staging commands
that could include the unrelated dirty files listed above.

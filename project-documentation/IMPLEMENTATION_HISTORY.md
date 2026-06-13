# Frontend Implementation History

## Context

This record covers the frontend design-system migration performed on branch
`feature/frontend-design-system-refactor`. It records user requests and the
corresponding implementation so later contributors do not restore discarded
prototype behavior.

## Requests Received

1. Rebuild the existing React frontend with strict TypeScript, Tailwind CSS,
   shadcn-compatible primitives, semantic tokens, reusable components, and
   React Query while preserving the prototype appearance and user flows.
2. Provide a frontend-only mock state because Google OAuth, Resend, backend
   data, and invitation delivery were not available for visual testing.
3. Use the images in `samples_prototype/` as visual references.
4. Remove admin dashboard content that was outside the plan: reports, global
   role management, and recent-user widgets.
5. Make **Meus Projetos** the authenticated landing page for every role.
6. Keep an administrator's member-project list separate from the global project
   administration page.
7. Hide project-specific routes until a project is selected.
8. Expand Board cards and task dialogs with documented flags, comments,
   subtasks/checklists, bug fields, and Planning Poker.
9. Add first-administrator setup and invited-user activation screens.
10. Make the sidebar retractable to provide more Board space.
11. Include login and registration routes in demo mode.

## Work Completed

### Architecture

* Replaced the monolithic navigation with React Router route composition.
* Added TanStack Query for API state, cache invalidation, and mock mutations.
* Added Tailwind CSS v4 and shadcn-compatible semantic tokens.
* Added `cn()` and reusable UI/app components.
* Removed obsolete role dashboard modules and their dashboard-only components.

### Demo Environment

* Added a typed local Axios adapter and fixture database.
* Added projects, members, sprints, backlog cards, Board cards, comments,
  checklist items, Planning Poker votes, and administrative mutations.
* Persisted demo role and data in browser local storage.
* Added a reset action for restoring fixture data.
* Kept demo mode limited to development builds.

### Navigation and Project Scope

* Added **Meus Projetos** as the default authenticated route.
* Added separate **Projetos Admin** navigation for global administrators.
* Added contextual Board, Backlog, members, and sprint-history navigation only
  after project selection.
* Added an expanded and collapsed desktop sidebar state.

### Cards and Tasks

* Added visual indicators for card type, priority, blocked status, deadlines,
  QA waiting state, Planning Poker, unread comments, assignee, and estimate.
* Added a larger task creation dialog with task/bug-specific fields.
* Added card detail presentation with comments and subtasks/checklists tabs.
* Added private Planning Poker submission behavior in the demo adapter.
* Added mark-as-seen behavior when opening a card.

### Authentication

* Restyled the login screen to follow the prototype without separate admin and
  user login buttons.
* Added first-administrator setup and invited-user activation screens.
* Initially added `VITE_FIRST_BOOT` as a temporary frontend development switch;
  it was later replaced by the backend bootstrap-status endpoint.
* Kept Google OAuth and real email delivery outside demo mode.

## Verification Performed

* `npm run typecheck`
* `npm run lint`
* `npm run build`
* Headless rendered-page checks for login, project list, and Board.

All three quality commands passed at the end of this implementation pass.

## Authentication Integration Update - 2026-06-12

> Historical intermediate state: the Resend implementation below was replaced
> later the same day by the PostgreSQL queue and SMTP worker.

* Added a shared transactional-email service using the official Resend SDK.
* Migrated invitation, password recovery, MFA OTP, and existing API email
  notifications away from Django `send_mail`.
* Made failed invitation delivery remove the pending invitation so an
  administrator can retry it.
* Made production startup wait for `GET /api/auth/bootstrap-status/`, redirect
  to `/setup-admin` when no accounts exist, and show a retry state when system
  initialization cannot be determined.
* Added automated coverage for the Resend payload, missing configuration, MFA
  delivery, invitation failure cleanup, and first-administrator bootstrap.

## Asynchronous Email Stabilization - 2026-06-12

* Replaced synchronous Resend calls with a PostgreSQL-backed `email_fila`.
* Added a small Django worker with row locking, stale-job recovery, and at most
  three delivery attempts.
* Restored provider-independent Django SMTP configuration for Gmail app-password
  use without adding Redis, Celery, or another runtime service.
* Added shared responsive HTML and plain-text presentation for invitations,
  recovery, MFA, password changes, and existing card/project notifications.
* Preserved invitations when delivery fails and added an endpoint to schedule a
  valid pending invitation again.

## Authentication Flow Completion - 2026-06-13

* Connected the administrator invitation screen, invitation activation,
  password recovery, and password reset flows to the real backend.
* Stabilized authenticated routing so login targets `/app/projects` directly
  and session restoration preserves nested application routes.
* Verified invitation activation, password login, recovery, reset, Gmail SMTP,
  and Google OAuth through the local UI.
* Added focused disposable login tests for valid, invalid, missing-field,
  inactive-account disclosure, and email-MFA behavior.
* Added `wipe_db_state0` for restoring a disposable local PostgreSQL database to
  first boot without recreating the container or schema.

## Known Visual Differences

* Some font metrics and spacing differ slightly from the raster prototype.
* The retractable sidebar has no original screenshot because it was requested
  after the prototype was produced.
* Registration pages follow the established design language but have no source
  screenshots.

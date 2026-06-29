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
2. Use the images in `samples_prototype/` as visual references.
3. Remove admin dashboard content that was outside the plan: reports, global
   role management, and recent-user widgets.
4. Make **Meus Projetos** the authenticated landing page for every role.
5. Keep an administrator's member-project list separate from the global project
   administration page.
6. Hide project-specific routes until a project is selected.
7. Expand Board cards and task dialogs with documented flags, comments,
   subtasks/checklists, bug fields, and Planning Poker.
8. Add first-administrator setup and invited-user activation screens.
9. Make the sidebar retractable to provide more Board space.

## Work Completed

### Architecture

* Replaced the monolithic navigation with React Router route composition.
* Added TanStack Query for API state and cache invalidation.
* Added Tailwind CSS v4 and shadcn-compatible semantic tokens.
* Added `cn()` and reusable UI/app components.
* Removed obsolete role dashboard modules and their dashboard-only components.

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
* Added mark-as-seen behavior when opening a card.

### Authentication

* Restyled the login screen to follow the prototype without separate admin and
  user login buttons.
* Added first-administrator setup and invited-user activation screens.
* Initially added `VITE_FIRST_BOOT` as a temporary frontend development switch;
  it was later replaced by the backend bootstrap-status endpoint.
* Kept Google OAuth and real email delivery tied to real backend flows.

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

## Sprint 2 Card Flow Stabilization - 2026-06-21

* Added backend support for moving a backlog card into an active sprint through
  `PATCH /api/cards/<id>/` with `sprint_id`, placing it in `To do`.
* Restricted card edit `PATCH` to admin or project `GERENTE`, matching the
  documented usage flow.
* Added backlog actions to move cards to the active sprint or remove them.
* Added `dnd-kit` drag-and-drop movement in the Board as the only frontend
  column movement control.
* Adjusted movement permissions so assigned users can move their own cards and
  any member can assume an unassigned card.
* Converted card edit save to a React Query mutation with visible API errors,
  so failed saves no longer look like an inert button.
* Added a narrow optimistic cache update for Board column movement and kept
  normal invalidation/refetch for broader card edits.
* Added a centered Board wrapper with responsive column widths so the board
  fills available space without making cards too wide.
* Removed column editing from the card detail modal to avoid duplicated movement
  paths.
* Added acceptance criteria to the card edit form.
* Added a migration allowing deadline history rows to represent setting or
  clearing an optional deadline.

## Known Visual Differences

* Some font metrics and spacing differ slightly from the raster prototype.
* The retractable sidebar has no original screenshot because it was requested
  after the prototype was produced.
* Registration pages follow the established design language but have no source
  screenshots.

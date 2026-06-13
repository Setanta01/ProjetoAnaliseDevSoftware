# Decisions and Reasons

## Purpose

This document records decisions made during the frontend migration, especially
where the latest user direction extends or overrides the original prototype.

## Product Decisions

### Projects are the authenticated entry point

**Decision:** Route authenticated users to **Meus Projetos**.

**Reason:** A user's sprint context is undefined before project selection, and
project roles are contextual rather than global. This also directly follows the
latest requested flow.

### Administrators have two project views

**Decision:** Keep **Meus Projetos** for projects where the administrator is a
member and **Projetos Admin** for organization-wide administration.

**Reason:** Membership work and global lifecycle administration have different
permissions and purposes. Combining them would hide the distinction documented
by `/projetos/` and `/admin/projetos/`.

### Project routes are contextual

**Decision:** Show Board, Backlog, members, and sprint history only after a
project has been selected.

**Reason:** These resources require a project identifier and project-specific
role. Showing them globally implies a scope that does not exist.

### No global role-management shortcut

**Decision:** Do not provide a global **Gerenciar Cargos** action.

**Reason:** `GERENTE`, `DEV`, and `QA` belong to `projeto_membros`; one person
may have different roles in different projects.

### No reports or recent-users dashboard widgets

**Decision:** Remove those widgets from the rebuilt frontend.

**Reason:** Reports were outside the planned scope, and recent users were
explicitly rejected as unhelpful. Neither is required for core project work.

### Retractable sidebar

**Decision:** Preserve the `w-64` expanded sidebar and add a compact icon mode.

**Reason:** This preserves the prototype in its default state while satisfying
the request to release horizontal space for the Kanban Board.

### One login form

**Decision:** Use one login action for all account types.

**Reason:** The separate admin/user presentation in the prototype was stated to
be demonstration-only. Authorization is determined after authentication.

### First administrator bootstrap

**Decision:** Add a first-administrator registration screen controlled by the
backend bootstrap-status endpoint.

**Reason:** Invitation-only registration cannot begin without an initial
administrator. The backend uses an atomic PostgreSQL check and lock so client
configuration cannot reopen bootstrap. The earlier `VITE_FIRST_BOOT` switch was
temporary and has been removed from production authority.

### Invitation registration

**Decision:** Add an invitation activation page using the documented
`POST /api/auth/ativar-convite/` contract.

**Reason:** Public self-registration is intentionally unavailable after first
boot; invited users still need a route for defining their credentials.

### Local demo adapter

**Decision:** Simulate API behavior in development rather than requiring Google
OAuth, Resend, and populated backend data for frontend review.

**Reason:** OAuth and email delivery test integrations, not most presentation
states. Typed fixtures make visual and interaction review deterministic without
inventing production backend APIs.

## Technical Decisions

### Semantic Tailwind tokens and shadcn-compatible primitives

**Reason:** This follows the requested architecture, removes ad-hoc styling,
and keeps future design changes centralized.

### React Query invalidation after mutations

**Reason:** This matches the documented short-polling architecture and allows
the same presentation components to work with demo and real API adapters.

### No global notification bell

**Reason:** Notifications are contextual card flags and critical emails in the
canonical architecture. A bell would introduce an undocumented product flow.

### PostgreSQL queue with Gmail SMTP

**Decision:** Persist outbound email jobs in PostgreSQL and deliver them with a
small Django management command using Gmail SMTP.

**Reason:** Provider calls must not block API requests. PostgreSQL is already a
required service, so a small queue table avoids adding Redis and Celery for the
project's expected volume. SMTP remains replaceable through Django settings.

### Google account creation requires an invitation

**Decision:** Google OAuth may link an existing account, but a new Google user
is created only when a valid, unused invitation exists for the returned email.

**Reason:** Google authentication must not bypass the invitation-only account
policy. The invitation determines whether the new account receives global admin
access and is consumed after account creation.

### Demo mode cannot be enabled in production builds

**Reason:** Local fixtures and mock authentication must not become a production
authentication bypass.

## Decisions Still Required

1. Confirm whether administrators can edit a project directly through
   `/projetos/<id>/` after locating it through `/admin/projetos/`.
2. Define exact Board drag-and-drop behavior and optimistic rollback messages.
3. Supply responsive prototype references if mobile parity is required.

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

### Admin project ownership is not project management

**Decision:** An administrator who creates a project does not automatically
become `GERENTE`. The project must have at least one `GERENTE`, but that person
can be the admin or another existing user.

**Reason:** Admin is a high-level system role for project lifecycle management.
`GERENTE` is the involved project role that manages sprint execution, cards and
team routine inside one project.

### Project routes are contextual

**Decision:** Show Board, Backlog, members, and sprint history only after a
project has been selected.

**Reason:** These resources require a project identifier and project-specific
role. Showing them globally implies a scope that does not exist.

### No global role-management shortcut

**Decision:** Do not provide a global **Gerenciar Cargos** action.

**Reason:** `GERENTE`, `DEV`, and `QA` belong to `projeto_membros`; one person
may have different roles in different projects.

### Project members come from existing users

**Decision:** Project member assignment selects existing system users only.

**Reason:** Invitation and account creation remain separate auth flows. Project
membership should not create implicit accounts or duplicate invite behavior.

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

### Fixed Board columns for Sprint 2

**Decision:** Use fixed Board columns `To do`, `In Progress`, `Review`, `Done`.
The column names remain in English for this delivery, while the rest of the app
continues using pt-BR. Users cannot create columns and the structure remains
fixed.

**Reason:** The planning documents treat columns as generated project structure,
not user-configurable workflow design. Keeping the structure fixed lowers
implementation complexity and preserves predictable Sprint 2 behavior.

### Card creation and estimation ownership

**Decision:** Only `GERENTE` can create cards. A card can start in the backlog
or in `To do` for a sprint. Deadline and difficulty are optional. Difficulty can
be set manually or by ending Planning Poker.

**Reason:** The endpoint contract marks card creation as `[GER]`, and card
estimation is part of sprint planning rather than a required field for every
task.

### Planning Poker closure

**Decision:** `GERENTE` can end Planning Poker even if not everyone voted. The
manager sees who voted and which vote values were received, but these are kept
as separate lists. The UI and API do not connect a person to a vote value.

**Reason:** Sprint planning needs a practical moderator decision point. Hidden
votes preserve estimation privacy; showing participation and the anonymous
value set gives the manager enough context to decide whether to wait or close.

### Sprint closure prepares the next sprint

**Decision:** Closing a sprint should require next-sprint setup so work can
continue immediately after the current sprint ends.

**Reason:** Sprint 2 includes manual closure and migration of unfinished work.
Requiring next-sprint context avoids leaving pending cards without a clear
destination.

### Sprint closure uses planned sprint or pause

**Decision:** Sprint closure no longer asks for the next sprint name. The
manager either moves pending cards to an existing `PLANEJADA` sprint or closes
the current sprint and pauses the project. When a paused project resumes by
starting the planned sprint, pending cards from the latest closed sprint migrate
to `To do`.

**Reason:** The user clarified that closure should not force typing a new
sprint name. A pause path is needed for periods like collective vacations, and
using the existing `PLANEJADA` sprint avoids adding another sprint status or a
heavier scheduling model.

### Single planned sprint per project remains strict

**Decision:** Keep the rule of at most one `PLANEJADA` sprint per project.

**Reason:** This matches the current schema and endpoint contract, and avoids
introducing a future-sprint planning backlog that the application does not yet
support.

### Backlog card preparation for sprint

**Decision:** Moving a backlog card into sprint `To do` opens the card creation
or edit flow with existing details prefilled. Creating a card directly in the
backlog avoids sprint-specific fields such as priority, responsible user,
deadline and difficulty. Those fields are reviewed when the card enters a
sprint.

**Reason:** A backlog card can already contain useful product details, but
entering a sprint is the point where execution-specific fields may need
confirmation.

### Card editing before drag-and-drop

**Decision:** `GERENTE` can edit title, description, priority, responsible,
deadline, estimate and board column from the card detail modal. Drag-and-drop
movement remains a later UI improvement.

**Reason:** The backend already exposes the stable `PATCH /cards/<id>/`
contract. Using it from the existing modal fixes the actual workflow with much
less frontend entropy than adding drag-and-drop state management at this stage.

### Invite activation name and session duration

**Decision:** User activation by invite requires a manually entered full name
and no longer derives the display name from the email address. Local access
tokens last 24 hours.

**Reason:** The invited user is the only reliable source for their display name.
The project is a university prototype and should not interrupt testing sessions
with short token expiry.

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

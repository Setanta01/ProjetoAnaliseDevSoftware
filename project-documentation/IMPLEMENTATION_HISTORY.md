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
* Added `VITE_FIRST_BOOT` as a temporary frontend development switch.
* Kept Google OAuth and real email delivery outside demo mode.

## Verification Performed

* `npm run typecheck`
* `npm run lint`
* `npm run build`
* Headless rendered-page checks for login, project list, and Board.

All three quality commands passed at the end of this implementation pass.

## Known Visual Differences

* Some font metrics and spacing differ slightly from the raster prototype.
* The retractable sidebar has no original screenshot because it was requested
  after the prototype was produced.
* Registration pages follow the established design language but have no source
  screenshots.

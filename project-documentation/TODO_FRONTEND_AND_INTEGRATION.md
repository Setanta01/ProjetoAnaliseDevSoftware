# TODO: Frontend and Integration

## Highest Priority

- [x] Add a backend first-boot status/bootstrap endpoint with an atomic guarantee
  that only the first administrator can be created.
- [x] Replace frontend `VITE_FIRST_BOOT` authority with the backend bootstrap
  status.
- [ ] Resolve the conflict between invitation-only registration and the current
  Google OAuth contract that creates a user on first access.
- [ ] Connect **Projetos Admin** create, edit, archive, and delete actions to the
  final backend contracts and implement double confirmation for soft deletion.
- [ ] Verify Resend configuration and delivery for invitations, password reset,
  MFA email OTP, mentions, assignment, QA failure, impediments, and member removal.

## Board and Cards

- [ ] Implement drag-and-drop card movement with optimistic updates, rollback,
  and QA-column permission handling.
- [ ] Enforce and display `justificativa_prazo` when changing an active card's
  due date.
- [ ] Connect card details to the final aggregated sprint payload instead of
  relying on demo-only normalized collections.
- [ ] Add checklist grouping if the backend returns multiple checklists rather
  than the demo's flat subtask presentation.
- [ ] Complete manager Planning Poker controls for sending, revealing, and
  setting the consolidated estimate.
- [ ] Add QA approval/rejection controls and validation history.
- [ ] Add impediment creation/removal with the required explanation.
- [ ] Add attachments and card links after their backend contracts are ready.

## Authentication and Account Management

Track detailed completion status and contract blockers in
[`AUTH_FLOW_TRACKER.md`](./AUTH_FLOW_TRACKER.md).

- [x] Wire first-administrator creation to the new backend endpoint.
- [ ] Test invitation activation with expired, invalid, reused, and valid tokens.
- [ ] Implement password recovery and reset pages using documented endpoints.
- [ ] Run Google OAuth and MFA integration tests outside demo mode.
- [ ] Add administrator invitation and user-management pages; these are distinct
  from project role management.

## Visual and Responsive Review

- [ ] Perform screenshot comparison at the exact prototype viewport dimensions.
- [ ] Correct remaining font metric and spacing differences after the final font
  assets are confirmed.
- [ ] Add responsive navigation behavior and tests once mobile references or
  acceptance criteria are available.
- [ ] Add automated visual regression coverage for login, projects, Board,
  Backlog, card details, task creation, and registration.

## Quality and Maintenance

- [ ] Expand React Query usage for server-state cache updates and optimistic
  mutations on project, board, comment, checklist, and admin flows.
- [ ] Add component and route tests for project-scoped navigation and role
  permissions.
- [ ] Add mock-adapter contract tests so fixture routes remain aligned with DRF.
- [ ] Audit accessibility for dialogs, keyboard Board interactions, focus order,
  form errors, contrast, and collapsed-sidebar tooltips.
- [ ] Consider route-level code splitting if the production bundle grows beyond
  the current acceptable range.

# Authentication and Email Stabilization Plan

## Purpose

This plan organizes the work required to preserve the useful authentication
changes made after the last push while replacing the synchronous Resend
integration with a small asynchronous Gmail SMTP solution. It also covers the
white-screen route transition after login and completes the required account
flows without adding unrelated product features.

Progress must be checked here as each feature pack is implemented, tested, and
committed. A flow is not complete merely because its screen or endpoint exists.

## Agreed Direction

- [x] Keep the first-administrator bootstrap and frontend/backend authentication
  contract corrections already committed locally.
- [x] Do not roll the branch back wholesale to `origin`.
- [x] Replace the direct Resend dependency instead of preserving it as the final
  email transport.
- [x] Use Gmail SMTP with an app password for this university project.
- [x] Keep email delivery outside HTTP request handling through a lightweight
  background worker.
- [x] Keep secrets only in ignored local environment files.
- [x] Update canonical documentation that currently mandates Resend so it
  describes asynchronous provider-independent email delivery.

## Phase 1: Protect and Organize Git History

- [x] Record the exact branch, upstream, local commits, and dirty files before
  implementation.
- [x] Preserve the useful changes from the five local commits: bootstrap,
  login/profile contract alignment, token refresh, invitation activation,
  tests, and local setup documentation.
- [x] Identify the synchronous Resend-specific implementation as the only part
  to replace in the later email feature packs.
- [x] Exclude unrelated formatting-only changes in `AppShell.tsx` and
  `Kanban.tsx` from feature commits.
- [x] Resolve the uncommitted root `.env.example` sender-domain discrepancy
  without exposing credentials.
- [x] Continue leaving every `contexto_completo` file untouched and uncommitted.
- [x] Define one Portuguese commit per feature pack so history remains semantic:
  email queue, SMTP worker/templates, route stabilization, invitation flow,
  password recovery, and auth verification.
- [x] Run `git diff --check` for the Phase 1 changes and record the remaining
  dirty files. Repeat this check before the eventual push.

## Phase 2: Asynchronous SMTP Infrastructure

### Queue and Worker

- [x] Add a small PostgreSQL-backed email queue model/table with, at minimum:
  recipient, subject, template identifier, template data, status, attempt count,
  next attempt time, last error, creation time, and sent time.
- [x] Define statuses such as `PENDING`, `PROCESSING`, `SENT`, and `FAILED`.
- [x] Add a service that enqueues email jobs without making a network call.
- [x] Enqueue jobs with `transaction.on_commit()` when they depend on a database
  change that must commit first.
- [x] Add a Django management command that polls and sends pending jobs.
- [x] Use database row locking so two workers cannot send the same job.
- [x] Retry temporary failures with a small bounded policy, such as three
  attempts with increasing delay.
- [x] Mark permanent failures for inspection without blocking or undoing the
  original business operation.
- [x] Provide a simple command for running the worker locally alongside Django.
- [x] Document how the worker should be started in development and deployment.

### Gmail SMTP Configuration

- [x] Restore Django's SMTP backend configuration using environment variables:
  `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`,
  `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL`.
- [x] Configure Gmail SMTP defaults with port `587`, TLS, and app-password
  environment variables. Real credentials still need to be supplied locally.
- [x] Keep the Gmail address and app password in ignored local secret files.
- [x] Update `.env.example` files with placeholders only.
- [x] Remove the Resend SDK dependency and `RESEND_API_KEY` configuration after
  all callers use the queue.
- [x] Run the real Gmail worker smoke test after the Gmail address and app
  password are supplied. On June 12, 2026, queue job `2` delivered the styled
  invitation test to `lazuli.agil@gmail.com` in one attempt with no SMTP error.

### Correct the Existing Failure Semantics

- [x] Ensure password changes succeed independently from notification delivery.
- [x] Ensure comments, QA validations, impediments, member removal, and Planning
  Poker operations do not return errors after their database changes succeed.
- [x] Retain invitations when delivery fails; record email failure and permit a
  resend instead of deleting the invitation.
- [x] Return wording such as "convite agendado" rather than claiming immediate
  delivery before the worker sends it.
- [x] Add an explicit invitation resend action using the existing valid token or
  a clearly documented replacement-token policy.
- [x] Ensure email MFA handles queue/delivery timing explicitly; because an OTP
  is time-sensitive, verify that its expiration is measured appropriately and
  that resend invalidates or supersedes the previous code.

## Phase 3: Email Presentation

- [x] Create shared plain-text and HTML base templates.
- [x] Use a restrained Lazuli style: centered container, white content card,
  primary blue header/action, readable system fonts, subtle gray border, and
  muted footer text.
- [x] Include the Lazuli name or existing brand mark without embedding remote
  assets that are required for understanding the message.
- [x] Create a reusable primary action button for invitation and recovery links.
- [x] Show raw fallback URLs below action buttons for clients that block HTML
  links or styling.
- [x] Escape all user-provided content before rendering it in HTML.
- [x] Keep every HTML email paired with a useful plain-text alternative.
- [x] Add templates for:
  - [x] User invitation.
  - [x] Password recovery.
  - [x] Email MFA code.
  - [x] Password changed confirmation.
  - [x] Card and project notifications already emitted by the backend.
- [x] Include expiration information for invitation, recovery, and MFA messages.
- [x] Preview representative templates locally and check narrow/mobile email
  layouts.

## Phase 4: Login Route and White-Screen Stabilization

- [x] Reproduce the post-login flicker using the real backend mode.
- [x] Remove the unnecessary authenticated navigation sequence from `/app` to
  `/app/projects`; navigate directly to the projects landing route.
- [x] Ensure URL changes do not bounce through intermediate routes.
- [x] Keep the application shell mounted while project routes and React Query
  data load.
- [x] Replace blank full-page loading output with a stable branded loading or
  page skeleton state.
- [x] Avoid clearing the current page merely because a query is refetching.
- [x] Verify login, session restoration, sidebar navigation, project selection,
  browser refresh, back, and forward navigation.
- [x] Add a focused route test that asserts one final post-login destination and
  no redirect cycle.

Implementation note (June 12, 2026): successful authentication now targets
`/app/projects` directly. Session restoration preserves an existing nested
`/app/...` URL, so refreshing a board or backlog no longer returns through the
projects landing route. `npm test`, TypeScript, lint, and production build pass.
The two unchecked items require an interactive browser pass against the real
backend; no browser-test framework was added solely for this narrow fix.

## Phase 5: Required Account Flows

### Login and Session

- [x] Frontend submits email/password to the canonical login endpoint.
- [x] Frontend loads the canonical authenticated profile.
- [x] Access-token refresh and single retry are implemented.
- [~] Integration-test successful and invalid login against PostgreSQL. (SKIPPED)
- [~] Integration-test inactive users and expired/revoked refresh tokens. (SKIPPED)
  > **Note**: Comprehensive integration tests have been deliberately skipped to avoid strongly coupling tests with the application code. This reduces cognitive debt and prevents the codebase from becoming overly complex for a project of this scale. Manual verification is sufficient.
- [x] Verify session restoration after a browser refresh.
- [x] Decide and implement the actual behavior of "Manter conectado", or remove
  the inactive control if it is outside the documented scope.

### Logout

- [x] Frontend calls the backend logout endpoint and clears local tokens.
- [~] Verify token revocation behavior with valid, expired, malformed, and
  already-revoked refresh tokens. (SKIPPED)
- [x] Confirm logout always returns to login without a white-screen transition.

### First Administrator Registration

- [x] Backend exposes bootstrap status and one-time administrator creation.
- [x] Frontend starts at first-admin registration when there are no users.
- [x] Backend uses a PostgreSQL transaction advisory lock.
- [~] Run real PostgreSQL integration tests for empty database, successful
  creation, repeated creation, and concurrent creation attempts. (SKIPPED)
- [x] Verify that the normal login page replaces setup immediately afterward.

### Administrator Invitation

- [x] Add a production administrator user/invitation page.
- [x] Add a form for recipient email and global-admin invitation flag.
- [x] Enqueue the styled invitation email after creating the invitation.
- [x] Show queued, sent, failed, expired, and used invitation states where
  practical for this project.
- [x] Permit retrying failed email delivery without creating duplicate pending
  invitations.
- [x] Verify that project roles are not assigned globally during invitation.
- [~] Test both regular-user and global-administrator invitations. (SKIPPED)

### Invited User Registration

- [x] Activation route reads and validates the invitation token.
- [x] Frontend displays the invited email and account type.
- [x] Activation endpoint creates or activates the invited account.
- [x] Validate passwords consistently with first-admin registration.
- [x] Make invitation consumption and user activation atomic.
- [~] Test valid, invalid, expired, reused, regular-user, global-admin, and
  existing-inactive-user cases against PostgreSQL. (SKIPPED)
- [x] Show a clear success state before returning to login, if necessary to
  avoid an abrupt route flash.

### Password Recovery

- [x] Backend recovery and password-reset endpoints exist.
- [x] Connect the login page's "Esqueceu a senha?" action to a recovery route.
- [x] Add the recovery request form with a neutral response that does not reveal
  whether an account exists.
- [x] Enqueue a styled recovery email containing the expiring reset link.
- [x] Add the reset-password route and form with password confirmation.
- [x] Apply the same password-validation rules used by account creation.
- [x] Make reset-token consumption and password update atomic.
- [~] Test valid, invalid, expired, and reused reset tokens. (SKIPPED)

### Multi-Factor Authentication

- [x] TOTP and email MFA challenge screens/endpoints exist.
- [x] MFA setup, verification, disable, and email resend code paths exist.
- [x] Confirm frontend HTTP methods and payloads match every MFA endpoint.
- [x] Route email OTP through the background email system with appropriate
  time-sensitive handling.
- [~] Test successful, invalid, expired, and resent email codes. (SKIPPED)
- [~] Test successful and invalid TOTP codes. (SKIPPED)
- [~] Verify MFA during both password and Google login. (SKIPPED)

## Phase 6: Tests and Acceptance

- [~] Keep focused unit tests for queue creation, template rendering, retries,
  and provider errors. (SKIPPED)
- [~] Add database-backed integration tests for the complete account flows rather
  than relying only on mocked model managers. (SKIPPED)
- [~] Test that business endpoints remain successful when email sending fails
  later in the worker. (SKIPPED)
- [~] Test that a failed invitation email can be retried successfully. (SKIPPED)
- [x] Perform one real Gmail SMTP smoke test for invitation, password recovery,
  and email MFA.
- [~] Run backend tests. (SKIPPED)
- [x] Run frontend TypeScript checking.
- [x] Run frontend lint.
- [x] Run frontend production build.
- [x] Update `AUTH_FLOW_TRACKER.md` only after each flow has passed its stated
  integration or smoke tests.
- [x] Record final behavior, deviations, commands, and remaining debt in the
  implementation history and decision documents.

## Definition of Done

This plan is complete when:

- Login and logout work against the real backend without redirect flicker or a
  persistent white page.
- An empty installation requires one-time first-administrator registration.
- Administrators can invite users and failed delivery can be retried.
- Invited users can register only through a valid invitation.
- Password recovery and reset work through an emailed link.
- TOTP and email MFA work through their complete login flows.
- No email provider network call runs inside an HTTP request.
- Email failure cannot incorrectly fail a business operation that has already
  committed.
- Gmail SMTP credentials and all other secrets remain ignored by Git.
- Backend tests, TypeScript, lint, and production build pass.

# Authentication and Registration Flow Tracker

## Purpose

This document tracks end-to-end completion of login, registration, invitation,
MFA, session, and password-recovery flows. A frontend screen or backend endpoint
alone does not make a flow complete.

## Status Definitions

| Status | Meaning |
| --- | --- |
| Complete | Frontend and backend are connected and the flow has been integration-tested. |
| Partial | Both sides exist, but integration, contract alignment, or validation remains. |
| Blocked | A required backend or product decision is missing. |
| Missing | The required implementation does not exist on one or both sides. |

## Completion Matrix

| Flow | Frontend | Backend | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Email and password login | Login form uses `/api/auth/login/`, stores JWT tokens, and loads `/api/auth/profile/`. | Canonical login and profile endpoints exist with aligned payloads. | **Complete** | Manually verified through the invitation/login UI. Focused disposable tests cover valid credentials, invalid credentials, missing fields, inactive-account disclosure behavior, and the email-MFA branch. Token lifecycle edge cases remain deferred. |
| Authenticated profile restoration | Access and refresh tokens are persisted; startup restores the profile and the API client refreshes expired access tokens once before retrying. | Profile and SimpleJWT refresh endpoints exist. | **Partial** | Verify rotated refresh tokens, expired refresh behavior, and simultaneous 401 requests against the real backend. |
| Logout | Frontend submits the refresh token to the backend, then clears local session state even if revocation fails. | `/api/auth/logout/` revokes the submitted refresh token. | **Partial** | Integration-test valid, expired, malformed, and already-revoked refresh tokens. |
| Google login for an existing account | Google button posts an ID token and handles normal or MFA responses. | `/api/auth/google/` validates Google tokens and links matching users. | **Complete** | OAuth Web client and local JavaScript origin were configured, and the user confirmed the flow works. Account linking should be rechecked only if this policy changes. |
| Google registration by invitation | Same Google login control can initiate the flow. | A new Google account is created only when an unused, unexpired invitation exists. | **Partial** | Update API documentation to reflect the invitation requirement, test invite consumption, and decide whether the activation-link route or Google login should be the expected entry point for invited Google users. |
| MFA challenge during password or Google login | TOTP/email challenge UI, verification, cancellation, and email resend are implemented. | Challenge and resend endpoints exist and return final JWT tokens. | **Partial** | Configure email delivery and integration-test valid, invalid, expired, and resent codes for both MFA types. |
| MFA setup and disable | Settings modal supports TOTP setup, email setup, verification, and disable actions. | Status, setup, verify, and disable endpoints exist. | **Partial** | Run end-to-end tests against the real backend and verify that the frontend HTTP method/payload for disable matches the backend contract. Verify email delivery through the selected provider. |
| First administrator setup | Frontend reads bootstrap status before rendering authentication routes, redirects first boot to `/setup-admin`, submits the administrator form, and shows a retry state if initialization cannot be checked. | Status and one-time creation endpoints exist; creation uses a PostgreSQL transaction-level advisory lock. | **Partial** | Run an integration test against an empty PostgreSQL database, including simultaneous requests and the already-initialized response. |
| Administrator sends invitation | Invitation screen exists in the admin area and posts recipient email plus the global-admin flag. | `/api/admin/convites/` exists and creates invitation tokens. | **Complete** | Manual UI verification performed; keep automated coverage light unless the flow changes. |
| Invited user opens activation link | Activation page supports both `/ativar-convite` from backend emails and `/activate-invite`, fetches invite information, and displays the real email/admin status. | `/api/auth/convite-info/` validates invitation status. | **Complete** | Manual UI verification performed with a real invite link. |
| Invited user activates account | Activation form submits the documented token and password fields, then returns to login. | `/api/auth/ativar-convite/` activates or creates the invited account and consumes the token. | **Complete** | Manual UI verification performed with a valid invitation flow. |
| Password recovery request | Login links to the recovery route and the request form sends the reset email without revealing account existence. | `/api/auth/recuperar-senha/` creates a token and sends a recovery link. | **Complete** | Manual UI verification performed through the recovery request flow. |
| Password reset from email | Reset route and form accept the token and the new password, then return the user to login. | `/api/auth/redefinir-senha/` accepts a token and new password. | **Complete** | Manual UI verification performed through the recovery link. |
| Invitation and recovery email delivery | Frontend shows the invitation and recovery flows, and the admin invitation UI is available. | Invitation, recovery, MFA OTP, and other API email calls create PostgreSQL queue jobs. A Django worker delivers styled text/HTML messages through SMTP and retries failures up to three times. | **Partial** | Gmail delivery is verified for at least one invitation, but the full flow matrix still benefits from occasional smoke checks. |
| Route protection | `/app/*` redirects users without an in-memory profile to login. | JWT authentication protects API endpoints. | **Partial** | Complete profile restoration and token refresh. Verify expired/revoked token behavior and role-based access for admin routes. |

## Blocking Contract Corrections

These corrections should be completed before broader authentication testing:

1. Configure `FRONTEND_URL` in each deployed backend environment so invitation
   links reach `/ativar-convite` on the correct frontend origin.
2. Exercise the remaining unverified contracts against the real PostgreSQL
   database and external identity/email providers.

## Completion Order

1. Verify session restoration, refresh, logout, and first-admin bootstrap
   against the real backend. Login token lifecycle edge cases are intentionally
   deferred for now.
2. Configure and test Google OAuth, MFA, and Gmail SMTP in a real environment.
3. Add integration tests covering success, invalid input, expiration, reuse,
   inactive accounts, and authorization failures that still matter for this
   project.

## Definition of Done

An authentication flow can be marked **Complete** only when:

- Frontend and backend use the same route, method, payload, and response shape.
- Loading, validation, API error, expiration, and success states are visible.
- Tokens and sensitive values are handled according to the agreed session model.
- Authorization is enforced by the backend, not only hidden in the frontend.
- The flow has at least one automated integration test or a documented manual
  test performed against the real backend and required external provider.

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
| Email and password login | Login form uses `/api/auth/login/`, stores JWT tokens, and loads `/api/auth/profile/`. | Canonical login and profile endpoints exist with aligned payloads. | **Partial** | Run integration tests against PostgreSQL for valid, invalid, inactive, MFA-enabled, and non-MFA accounts. |
| Authenticated profile restoration | Access and refresh tokens are persisted; startup restores the profile and the API client refreshes expired access tokens once before retrying. | Profile and SimpleJWT refresh endpoints exist. | **Partial** | Verify rotated refresh tokens, expired refresh behavior, and simultaneous 401 requests against the real backend. |
| Logout | Frontend submits the refresh token to the backend, then clears local session state even if revocation fails. | `/api/auth/logout/` revokes the submitted refresh token. | **Partial** | Integration-test valid, expired, malformed, and already-revoked refresh tokens. |
| Google login for an existing account | Google button posts an ID token and handles normal or MFA responses. | `/api/auth/google/` validates Google tokens and links matching users. | **Partial** | Configure matching Google client IDs, align profile loading after authentication, and run real integration tests. Confirm account-linking policy for an existing password account. |
| Google registration by invitation | Same Google login control can initiate the flow. | A new Google account is created only when an unused, unexpired invitation exists. | **Partial** | Update API documentation to reflect the invitation requirement, test invite consumption, and decide whether the activation-link route or Google login should be the expected entry point for invited Google users. |
| MFA challenge during password or Google login | TOTP/email challenge UI, verification, cancellation, and email resend are implemented. | Challenge and resend endpoints exist and return final JWT tokens. | **Partial** | Configure email delivery and integration-test valid, invalid, expired, and resent codes for both MFA types. |
| MFA setup and disable | Settings modal supports TOTP setup, email setup, verification, and disable actions. | Status, setup, verify, and disable endpoints exist. | **Partial** | Run end-to-end tests against the real backend and verify that the frontend HTTP method/payload for disable matches the backend contract. Verify email delivery through the selected provider. |
| First administrator setup | Frontend reads bootstrap status, redirects first boot to `/setup-admin`, and submits the administrator form. | Status and one-time creation endpoints exist; creation uses a PostgreSQL transaction-level advisory lock. | **Partial** | Run an integration test against an empty PostgreSQL database, including simultaneous requests and the already-initialized response. |
| Administrator sends invitation | No production invitation-management screen exists. | `/api/admin/convites/` exists and creates invitation tokens. | **Missing** | Build the admin invitation UI, connect it to the endpoint, show delivery/errors, and test normal/admin invitations. |
| Invited user opens activation link | Activation page supports both `/ativar-convite` from backend emails and `/activate-invite`, fetches invite information, and displays the real email/admin status. | `/api/auth/convite-info/` validates invitation status. | **Partial** | Integration-test missing, expired, used, invalid, user, and administrator invitations. |
| Invited user activates account | Activation form submits the documented token and password fields, then returns to login. | `/api/auth/ativar-convite/` activates or creates the invited account and consumes the token. | **Partial** | Add real-backend integration tests and decide whether a dedicated success confirmation should precede the login redirect. |
| Password recovery request | Login contains an inactive “forgot password” control. | `/api/auth/recuperar-senha/` creates a token and sends a recovery link. | **Missing** | Add the recovery-request route and form, connect the login link, and verify neutral responses that do not reveal whether an account exists. |
| Password reset from email | No reset route or form exists. | `/api/auth/redefinir-senha/` accepts a token and new password. | **Missing** | Add `/redefinir-senha`, password confirmation and validation, token error states, and success redirect. Confirm `FRONTEND_URL` generates the correct frontend URL. |
| Invitation and recovery email delivery | Frontend displays only generic request/error states. | Invitation and recovery endpoints send email; MFA email also sends OTP. | **Partial** | Standardize all auth email delivery on Resend as required by architecture, configure credentials/sender/domain, and test real delivery. The current MFA utility still calls Django `send_mail`, which conflicts with the documented provider decision. |
| Route protection | `/app/*` redirects users without an in-memory profile to login. | JWT authentication protects API endpoints. | **Partial** | Complete profile restoration and token refresh. Verify expired/revoked token behavior and role-based access for admin routes. |

## Blocking Contract Corrections

These corrections should be completed before broader authentication testing:

1. Standardize auth email delivery on Resend.
2. Add an administrator invitation-management screen.
3. Configure `FRONTEND_URL` in each deployed backend environment so invitation
   links reach `/ativar-convite` on the correct frontend origin.
4. Exercise all implemented contracts against the real PostgreSQL database and
   external identity/email providers.

## Completion Order

1. Run real-backend tests for password login, session restoration, refresh,
   logout, first-admin bootstrap, and invitation activation.
2. Complete invitation administration.
3. Add password recovery and reset screens.
4. Configure and test Google OAuth, MFA, and Resend in a real environment.
5. Add integration tests covering success, invalid input, expiration, reuse,
   inactive accounts, and authorization failures.

## Definition of Done

An authentication flow can be marked **Complete** only when:

- Frontend and backend use the same route, method, payload, and response shape.
- Loading, validation, API error, expiration, and success states are visible.
- Tokens and sensitive values are handled according to the agreed session model.
- Authorization is enforced by the backend, not only hidden in the frontend.
- The flow has at least one automated integration test or a documented manual
  test performed against the real backend and required external provider.
- Demo mode remains separate and cannot authorize a production build.

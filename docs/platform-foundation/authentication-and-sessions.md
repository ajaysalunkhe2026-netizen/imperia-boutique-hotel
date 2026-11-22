# Authentication and Secure Session Architecture — ADR 0002

Status: architecture decision draft; no provider has been connected and no login/session code is enabled.

## Decision summary

Keep the application authentication-provider-neutral until the hotel approves an identity provider and its operational cost. The application must consume a verified server-side identity, resolve the local application user, load current database memberships, and then call the existing authorization policy. Authentication and authorization remain separate concerns.

Do not treat a role, property ID, email address, or user ID supplied by a browser as proof of identity or permission.

## Trust flow

1. The browser starts an authentication flow with the selected provider.
2. The provider verifies the credential and returns a signed/otherwise verifiable authentication result.
3. A server-only callback validates the result (issuer, audience/client, signature or provider SDK verification, expiry, nonce/state and redirect URI as applicable).
4. The server maps the provider's immutable subject identifier to one local `app_users` record. Email alone is not a stable identity key.
5. The server checks that the local account is active and that required email/identity verification is satisfied.
6. For each protected request, the server loads active property memberships from PostgreSQL. Roles and membership status are not trusted from client state or stale browser claims.
7. The server constructs the `Principal` object and calls `authorize()` before reading or mutating protected resources.
8. The server writes security-relevant allow/deny and account/session events to the audit trail without logging credentials, tokens, cookies, or payment secrets.

## Session requirements

- Prefer opaque, cryptographically random server-side session identifiers; store only a hash of the identifier in the database.
- Browser cookie must be `HttpOnly`, `Secure` in HTTPS environments, and an appropriate `SameSite` value. Use a host-only cookie; do not widen the domain without a documented need.
- Rotate the session after authentication, privilege changes, password/identity recovery, and other re-authentication events.
- Enforce server-side expiry, revocation, logout invalidation, and account-disable invalidation. Cookie expiry alone is insufficient.
- Define idle and absolute lifetime separately for staff and guest sessions after the hotel approves the UX/security trade-off.
- Protect state-changing requests against CSRF; validate origin where appropriate and use framework-supported protections.
- Rate-limit authentication, recovery, verification, and session endpoints. Avoid account-enumeration responses.
- Never put access tokens, refresh tokens, session IDs, or secrets in localStorage, URLs, logs, analytics, or client-visible environment variables.
- Require MFA for platform administrators and hotel-owner accounts before production access. Manager MFA policy must be decided before launch.
- Re-check current membership and account status server-side for protected operations; high-risk actions may require recent re-authentication.

## Database changes required after provider selection

The current `app_users` table is a local application identity record, not an authentication credential store. Before enabling login, review and add migrations for:

- `auth_identities`: local user ID, provider/issuer, immutable provider subject, created/last-used timestamps; unique on (provider, subject).
- `auth_sessions`: local user ID, hashed opaque session token, created/last-seen/idle-expiry/absolute-expiry/revoked timestamps and minimal device metadata.
- Optional one-time verification/recovery records, stored hashed and expiring, if not fully delegated to the selected provider.
- A distinct global platform-role assignment model. The current property-membership table is property-scoped; a global `platform_admin` role must not be represented as an ordinary hotel membership. Update the policy principal loader and schema together.

Do not store raw passwords or provider tokens in these tables. If a provider is responsible for credential storage and session management, document exactly which session guarantees it supplies and which remain the application's responsibility.

## Authorization integration contract

- Resolve the session only in server-only code.
- Load the user and active memberships from the database for the requested property.
- Construct `Principal` from those verified records, never from request JSON, query strings, headers, client components, or JWT role claims.
- Call the policy in every protected Route Handler, Server Action, and server-side data access path.
- Resolve a requested resource under the same property scope before passing its owner ID to guest ownership checks.
- Return 401 for no valid identity and 403 for an authenticated identity without permission; avoid leaking whether another user's resource exists.
- Keep authorization checks close to the data operation and use database transactions for sensitive mutations.
- Add route-level tests for cross-property access, disabled accounts, revoked sessions, changed memberships, guest ownership, CSRF, and concurrent high-risk actions.

## Provider selection gate

Evaluate the provider against: Next.js 16 compatibility, secure server-side session verification, MFA/passkeys, email verification/recovery, rate limiting, auditability, account export/deletion, data residency/privacy terms, PostgreSQL integration, vendor lock-in, support, and total monthly cost.

No provider is selected in this ADR. A paid provider, hosted database, email/SMS service, or production credential must not be created until the owner approves the provider and budget. The first implementation target should be a development-only environment with synthetic accounts.

## Explicitly not implemented

- No login, signup, password, OAuth, magic-link, MFA, recovery, or logout screens.
- No session cookie, session table, identity mapping, auth SDK, or auth middleware.
- No database connection or membership resolver.
- No protected dashboard/API route integration.
- No production identity provider or secrets.

This document defines the security contract; it is not evidence that authentication is active.

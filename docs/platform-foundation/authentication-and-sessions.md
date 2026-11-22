# Authentication and Secure Session Architecture

Status: Supabase Auth is the selected development integration. Production identity activation still requires hotel-owner approval and security acceptance.

## Decision

Use Supabase Auth for credential verification and identity lifecycle. Use the application's own `app_users`, `property_memberships`, and `platform_admin_assignments` records as the source of application authorization. Authentication and authorization remain separate concerns.

## Trust flow

1. The browser authenticates through the configured Supabase Auth flow.
2. Supabase issues the cookie-backed session managed by `@supabase/ssr`.
3. Next.js 16 `proxy.ts` refreshes the session using the Supabase SSR integration.
4. Protected server code validates the session with `auth.getUser()`.
5. The immutable Supabase Auth user UUID maps to `app_users.auth_user_id`; email alone is never the identity key.
6. The server checks local account status, confirmed email, current property memberships and any active global Platform Admin assignment.
7. The server constructs a `Principal` and calls `authorize()` before reading or mutating protected resources.
8. Security-relevant allow/deny and account events are audited without logging credentials, tokens, cookies, guest PII or payment secrets.

## Session requirements

- Use the provider-managed cookie session; do not copy access/refresh tokens into localStorage or URLs.
- Cookie settings must remain HttpOnly, Secure in HTTPS environments, host-only, and use an appropriate SameSite policy.
- Refresh sessions through the Next.js 16 proxy integration; do not use `getSession()` as proof of identity.
- Re-check local account and membership status server-side for every protected operation.
- Protect state-changing requests against CSRF and validate origin where appropriate.
- Rate-limit authentication, recovery, verification and invitation endpoints.
- Require MFA for Platform Admin and hotel-owner production access. Decide manager MFA before launch.
- High-risk operations may require recent re-authentication and an audit event.

## Database mapping

- `app_users.auth_user_id` references `auth.users(id)` and has a unique partial index.
- `platform_admin_assignments` is a separate global authority model.
- Guest access is derived only from a guest profile explicitly linked to the authenticated local app user.
- Never grant roles from browser-submitted values or user-editable Auth metadata.

## Explicitly not implemented

- Login, logout, invitation, password recovery, MFA and guest authentication screens.
- Trusted staff provisioning and role-grant workflows.
- Booking, payment, cancellation or refund APIs.
- Protected owner/manager business dashboards.
- Commission ledger or aggregate reporting endpoints.
- Granular client-facing RLS policies. RLS is currently enabled with default-deny behavior.
- Database migrations have not been applied to Supabase.

This document describes the implementation boundary; it is not evidence that production authentication or business workflows are active.

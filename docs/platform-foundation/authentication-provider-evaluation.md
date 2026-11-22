# Authentication Provider Evaluation — ADR 0003

Status: Supabase selected for the development integration. Production activation requires explicit hotel-owner approval of ownership, billing, privacy terms and security controls.

## Decision

Use Supabase Auth with `@supabase/ssr` for cookie-based authentication in the Next.js 16 application. Keep hotel authorization in application-owned PostgreSQL tables and the server-side policy layer.

## Rationale

- Supabase Auth provides the identity service and stores its Auth users in the managed `auth` schema.
- The application maps the immutable Auth user UUID to `app_users.auth_user_id`.
- `@supabase/ssr` is the supported cookie-based integration for Next.js SSR; Next.js 16 uses `proxy.ts` for session refresh.
- The application retains control of hotel roles, property memberships and Platform Admin assignments.
- The server-only admin client is restricted to trusted server modules and bypasses RLS; all callers still require explicit authorization.

## Alternatives

Auth.js remains a valid option if the owner later chooses an independent PostgreSQL/authentication stack and accepts responsibility for adapters, email delivery, recovery, MFA/passkey configuration and session operations. Do not switch providers without a migration plan for user identity mapping and existing sessions.

## Production approval gate

Before enabling real hotel users or production traffic, confirm:
- Project ownership and who pays for the service.
- Plan, limits, backup and recovery expectations.
- Data processing/privacy terms and data residency.
- Staff login methods, guest identity flow and MFA policy.
- Email delivery, redirect URLs, abuse/rate limits and recovery contact.
- A tested account provisioning, revocation and incident-response workflow.

A development project is not production approval. Do not place live guest data or payment credentials in an unapproved environment.

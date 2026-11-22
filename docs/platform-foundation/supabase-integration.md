# Supabase integration foundation

## Decision

The application is being prepared for Supabase Auth using the official `@supabase/ssr` integration. The PostgreSQL schema remains application-owned and provider-neutral. Hotel authorization remains in the application policy and database membership model.

## Implemented in this change

- Browser client factory: `lib/supabase/client.ts`.
- Cookie-aware server client factory: `lib/supabase/server.ts`.
- Next.js 16 session refresh helper: `lib/supabase/proxy.ts`.
- Root Next.js 16 `proxy.ts`.
- Validated public environment configuration: `lib/supabase/env.ts`.
- Non-secret environment template: `.env.example`.

The integration uses the Supabase project URL and publishable key only. No service-role key is needed for browser or ordinary SSR session handling.

## Required configuration

Copy `.env.example` to `.env.local` only after an authorized development Supabase project exists. Populate the project URL and publishable key from that project's dashboard. Do not commit `.env.local`, tokens, database passwords, or service-role keys.

## Security boundaries

- The publishable key is expected to be public; it is not an authorization mechanism.
- Never trust role, property, owner, or permission values supplied by the browser.
- Do not treat decoded client state or user-editable Auth metadata as the source of hotel permissions.
- Protected server routes must validate the authenticated user and resolve the local application identity and active database memberships before calling `authorize()`.
- Platform administrator authority must come from a separate, explicitly managed global assignment, not a hotel property membership.
- MFA is required for platform administrators and hotel owners before production access is enabled.
- RLS should be added and tested before any browser-facing Data API access to business tables. Prefer server-only database access for privileged hotel operations.

## Not implemented yet

- No Supabase project has been created or connected.
- No authentication provider settings, redirect URLs, SMTP, MFA policy, or production secrets have been configured.
- No login, logout, invitation, password recovery, or MFA UI exists yet.
- No authenticated-user-to-`app_users` mapping or database membership adapter is wired into routes.
- No protected dashboard routes or route-level authorization checks exist yet.
- No RLS policies have been deployed.
- No database migration has been executed against Supabase.
- No production deployment has been made.

## Next implementation gate

Before enabling login, add the identity mapping and global platform-admin assignment migration, implement a server-only principal resolver, then build protected authentication flows and authorization tests. Run the complete CI suite and a staging security review before owner/manager accounts are invited.

# Supabase integration foundation

## Decision

The application uses the official `@supabase/ssr` integration for cookie-backed Next.js sessions and `@supabase/supabase-js` for the server-only administrative client. The PostgreSQL schema remains application-owned. Hotel authorization remains in the application policy and database membership model.

## Implemented

- Browser client factory: `lib/supabase/client.ts`.
- Cookie-aware server client factory: `lib/supabase/server.ts`.
- Next.js 16 session refresh helper: `lib/supabase/proxy.ts`.
- Root Next.js 16 `proxy.ts`.
- Validated public and server-only environment configuration.
- Server-only admin client.
- Principal resolver using Supabase Auth user verification and `app_users.auth_user_id`.
- Default-deny RLS baseline migration.

## Required configuration

Copy `.env.example` to `.env.local` only after selecting the intended development Supabase project. Populate the project URL and publishable key from that project's dashboard. Set `SUPABASE_SECRET_KEY` only in a trusted server environment. Never commit `.env.local`, tokens, database passwords, or secret keys.

## Security boundaries

- The publishable key is expected to be public; it is not an authorization mechanism.
- Never trust role, property, owner, or permission values supplied by the browser.
- Do not treat decoded client state or user-editable Auth metadata as the source of hotel permissions.
- Protected server routes must resolve the authenticated user and current database assignments before calling `authorize()`.
- Platform Admin authority comes from the separate `platform_admin_assignments` table.
- Platform Admin reporting permissions are limited to explicit aggregate business, revenue and commission capabilities. They do not grant raw reservation, payment, guest PII or write access.
- MFA is required for Platform Admin and hotel-owner production access before production launch.
- Migration 0003 enables RLS with no permissive policies. Browser Data API access remains blocked until granular policies are implemented and tested.
- The server admin client bypasses RLS; use it only in server-only modules and enforce authorization in every caller.

## Not implemented yet

- No login, logout, invitation, password recovery, or MFA UI.
- No trusted staff provisioning workflow.
- No booking, payment, cancellation, refund, or availability API.
- No owner or manager dashboards backed by live data.
- No Platform Admin aggregate reporting views/RPCs or commission ledger.
- No granular authenticated-user RLS policies; default-deny is intentional.
- No database migration has been executed against Supabase.
- No staging acceptance test or production deployment.

## Next implementation gate

Build the invitation/provisioning flow, protected dashboard routes and narrowly scoped data-access layer. Add reporting views/RPCs that return aggregates only, then implement granular RLS policies with tests. Run CI and staging security tests before enabling real accounts or booking data.

# Supabase server identity resolver

## What this adds
- A server-only Supabase admin client using `SUPABASE_SECRET_KEY`.
- A server-side principal resolver that validates the cookie-backed Supabase session with `auth.getClaims()`.
- Identity mapping through `auth_identities(provider='supabase', provider_subject=sub)`.
- Fresh hotel role lookup from `property_memberships`, global platform authority from `platform_admin_assignments`, and guest property scope from `guests`.

## Security constraints
- The secret key is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Never pass the admin client to browser code or return it from a route.
- Never derive roles or property access from user-editable Auth metadata, request bodies, query parameters, or headers.
- Call `resolvePrincipal()` only from server route handlers, server actions, or server components.
- Call `authorize()` for every protected operation after loading the target resource within the requested property scope.
- The resolver returns `null` for missing, unverified, disabled, or unmapped users. Provider/database failures throw a generic error; callers must fail closed.
- This resolver does not itself authorize a request, protect a route, or implement row-level security.

## Identity provisioning requirement
An invitation/provisioning flow must create the local `app_users` record and `auth_identities` mapping after a trusted Supabase Auth user has been created and verified. Do not auto-create hotel staff accounts from public sign-up. Owner and platform-admin assignments must be granted through a separately audited administrative workflow.

## Important limitation
The Supabase admin client uses the project's secret key for server-only lookups. This is a privileged bypass path; keep all queries in this small server-only module, use explicit property filters in business queries, and add database RLS policies before any direct browser-facing Data API access.

# Supabase server identity resolver

## Implemented

- A server-only Supabase admin client using `SUPABASE_SECRET_KEY`.
- A request-scoped, cookie-aware Supabase SSR client.
- A resolver that calls `auth.getUser()` to validate the cookie-backed session and require a confirmed email.
- Identity mapping through `app_users.auth_user_id` referencing `auth.users(id)`.
- Fresh role lookup from `property_memberships`, global Platform Admin assignment lookup from `platform_admin_assignments`, and guest property scope from linked `guests` rows.
- Guest PII is not included in the returned principal.

## Security constraints

- The secret key is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Never pass the admin client to browser code or return it from a route.
- Never derive roles or property access from user-editable Auth metadata, request bodies, query parameters, or headers.
- Call `resolvePrincipal()` only from trusted server route handlers, server actions, or server components.
- Call `authorize()` for every protected operation after loading the target resource under the requested property scope.
- Guest resource ownership must be loaded from the database; never accept `resourceOwnerUserId` from request input.
- Invalid, unconfirmed, disabled, or unmapped users return `null`. Privileged database failures throw a generic error so callers fail closed.
- The resolver does not itself authorize a business operation or implement row-level security.

## Identity provisioning requirement

A trusted invitation/provisioning workflow must create the local `app_users` record and set its `auth_user_id` to the verified Supabase Auth user UUID. Do not auto-create hotel staff accounts from public sign-up. Owner and Platform Admin assignments require a separately audited administrative workflow.

## Important limitation

The Supabase admin client uses the project's secret key and bypasses RLS. Keep it server-only and limited to trusted modules. Every route using it must still perform explicit authorization and return only the fields required by the role.

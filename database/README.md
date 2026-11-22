# Database foundation

This directory contains the PostgreSQL schema and security baseline for the IMPERIA platform.

## Migration order

1. `migrations/0001_initial_schema.sql` — core property, identity, guest, room, reservation, allocation, payment, webhook-event and audit tables.
2. `migrations/0002_auth_identity_and_platform_admin.sql` — Supabase Auth user mapping and separate global Platform Admin assignments.
3. `migrations/0003_enable_rls_default_deny.sql` — enables Row Level Security on every application table with no permissive client policies.

## Apply and test

Use a dedicated disposable PostgreSQL/Supabase development project. Review all migrations first, then apply them in numeric order. Run the SQL smoke tests only against a disposable database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0002_auth_identity_and_platform_admin.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0003_enable_rls_default_deny.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/0001_constraints.sql
```

The test script rolls back its fixture data. Never point it at a production database.

## Security boundaries

- RLS is enabled with default-deny behavior. Browser/anon/authenticated clients cannot read or mutate application tables until explicit policies are added in a separately reviewed migration.
- The Supabase secret/service key bypasses RLS. It is server-only and must never be sent to a browser or returned from an API.
- Server routes must resolve the current identity from the verified Supabase Auth user, load current DB assignments, authorize every operation, and select only fields required by that role.
- Platform Admin must not receive raw reservation, guest, or payment row access. Business/revenue/commission reporting must use restricted aggregate queries or carefully designed reporting views/RPCs.
- No real hotel room numbers, category counts, rates, tax rules, credentials, staff accounts, or guest records are seeded.
- Room categories and room records are configurable; the schema does not assume an unconfirmed room split or room category list.
- External identity is mapped through `app_users.auth_user_id`, referencing `auth.users(id)`.
- Platform administrators are global assignments in `platform_admin_assignments`, not property-scoped memberships.
- Active room allocations use half-open date ranges `[check_in, check_out)`; checkout and next check-in on the same date do not overlap.
- Expired holds require a trusted server-side expiry worker to transition allocations to RELEASED.
- Payment webhook handlers must verify provider signatures before accepting events and process each `(provider, provider_event_id)` exactly once.
- Store money as integer minor units with an ISO currency code; never use floating-point arithmetic for financial calculations.
- `btree_gist` is required for the room-allocation exclusion constraint.

## Important limitations

- Migration 0003 intentionally blocks all direct client table access until granular policies are implemented and tested. This protects data but means browser-side table queries will not work yet.
- The current server admin client bypasses RLS. It is only a trusted backend building block, not a substitute for per-request authorization.
- No commission tables or reports are implemented yet. The proposed 15% gross commission remains pending written hotel-owner approval and a precise gross-revenue/refund definition.
- Migrations are source code only until explicitly applied and verified against the intended development project.

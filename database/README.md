# Database foundation

This directory contains the PostgreSQL schema and integrity/security migrations for the IMPERIA platform.

## Migration order

1. `migrations/0001_initial_schema.sql` — core property, identity, guest, room, reservation, allocation, payment, webhook-event and audit tables.
2. `migrations/0002_auth_identity_and_platform_admin.sql` — Supabase Auth user mapping and separate global Platform Admin assignments.
3. `migrations/0003_enable_rls_default_deny.sql` — enables Row Level Security on every application table with no permissive client policies.
4. `migrations/0004_booking_integrity_and_audit_guards.sql` — database-maintained timestamps, room/category bookability validation, reservation/allocation lifecycle consistency, webhook checks and append-only audit/admin assignment history.
5. `migrations/0005_authenticated_read_policies.sql` — authenticated SELECT-only RLS policies for self, property staff and guest-owned rows. No client writes are enabled.

## Automated database verification

The GitHub Actions workflow provisions a disposable PostgreSQL service, creates a minimal `auth.users` compatibility table for migration testing, applies migrations in order, and runs SQL regression tests. This verifies PostgreSQL behavior in CI; it does not apply migrations to the Supabase project.

For a local disposable PostgreSQL database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0002_auth_identity_and_platform_admin.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0003_enable_rls_default_deny.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0004_booking_integrity_and_audit_guards.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0005_authenticated_read_policies.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/0001_constraints.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/0002_booking_integrity.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/0003_rls_access.sql
```

The SQL test files wrap fixtures in transactions and roll them back. Never point test scripts at a live hotel database.

## Security boundaries

- RLS is enabled with default-deny behavior. Browser/anon/authenticated clients cannot read or mutate application tables until explicit policies are added in a separately reviewed migration.
- The Supabase secret/service key bypasses RLS. It is server-only and must never be sent to a browser or returned from an API.
- Server routes must resolve the verified Auth user, load current database assignments, authorize each operation, and select only fields required by that role.
- Platform Admin must not receive raw reservation, guest, or payment row access. Business/revenue/commission reporting must use restricted aggregate queries or carefully designed reporting views/RPCs.
- No real room numbers, category counts, rates, tax rules, credentials, staff accounts, or guest records are seeded.
- Room categories and room records are configurable; the schema does not assume an unconfirmed room category split.
- External identity is mapped through `app_users.auth_user_id`, referencing `auth.users(id)`.
- Platform administrators are global assignments in `platform_admin_assignments`, not property-scoped memberships. Assignment rows can be revoked but not rewritten/reactivated by ordinary updates.
- Active room allocations use half-open date ranges `[check_in, check_out)`; checkout and next check-in on the same date do not overlap.
- Active allocations must fit within reservation dates and require an active, bookable room and bookable category.
- Reservation cancellation/no-show cancels held/confirmed allocations; checkout releases active allocations.
- Room/category bookability cannot be disabled while active allocations remain. Reassign or release allocations first.
- Expired holds still require a trusted server-side expiry worker to transition allocations to RELEASED.
- Payment webhook events are deduplicated by `(provider, provider_event_id)`; provider must match the payment, and processing requires a verified signature flag. The application must cryptographically verify the provider signature before setting that flag.
- Audit rows reject ordinary UPDATE/DELETE operations. Database owners/superusers can still bypass triggers; restrict operational privileges and use external backups/monitoring.
- Store money as integer minor units with an ISO currency code; never use floating-point arithmetic for financial calculations.
- `btree_gist` is required for the room-allocation exclusion constraint.

## Important limitations

- Migration 0003 initially blocks direct client table access. Migration 0005 adds narrowly scoped authenticated SELECT access only; all direct client writes remain denied. Anonymous/public website reads are not enabled.
- The server admin client bypasses RLS. It is only a trusted backend building block, not a substitute for per-request authorization.
- No booking API, payment gateway, webhook endpoint, trusted expiry worker, reporting views/RPCs or commission ledger is implemented yet.
- No Platform Admin provisioning function exists. Assignment creation must remain a trusted, audited operator workflow.
- Migration 0005 implements authenticated SELECT policies for hotel staff, guest-owned records and self identity. Owner/Manager/Guest write policies are intentionally not enabled; trusted server workflows are still required.
- The proposed 15% gross commission remains pending written hotel-owner approval and a precise gross-revenue/refund definition.
- Migrations are source code only until explicitly applied and verified against the intended development project.

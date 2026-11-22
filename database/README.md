# Database foundation

This directory contains the provider-neutral PostgreSQL schema for the IMPERIA platform.

## Contents
- `migrations/0001_initial_schema.sql`: core tables, foreign keys, checks, indexes, payment-event idempotency key, and active room-allocation overlap protection.
- `migrations/0002_auth_identity_and_platform_admin.sql`: external authentication identity mapping and a separate global platform-admin assignment model.
- `tests/0001_constraints.sql`: disposable-database smoke test for overlapping allocations and adjacent stays.

## Apply locally

Use a dedicated, disposable PostgreSQL database first. Review the migrations, then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0002_auth_identity_and_platform_admin.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/0001_constraints.sql
```

The test script rolls back its fixture data. Do not point it at production.

## Important design boundaries
- No real hotel room numbers, category counts, rates, tax rules, credentials, staff accounts, or guest records are seeded.
- Room categories and room records are configurable; the schema does not assume an unconfirmed 10/10/10/10 split or an Executive category.
- External identity is mapped to the local `app_users` record through `auth_identities`; provider subject IDs are not used as hotel business identifiers.
- Platform administrators are global assignments in `platform_admin_assignments`, not property-scoped memberships.
- Application code must enforce property membership and role permissions on every protected request. Database constraints alone do not implement RBAC.
- An active room allocation uses a half-open date range `[check_in, check_out)`, so a checkout and the next check-in on the same date do not overlap.
- Expired holds must be transitioned to `RELEASED` by a trusted server-side expiry worker. Until that transition occurs, a held allocation intentionally continues to block inventory.
- Payment webhook processing must verify provider signatures before setting `signature_verified`, and must process each `(provider, provider_event_id)` only once.
- Money is stored as integer minor units with a currency code; do not use floating-point values for financial calculations.
- `btree_gist` is required for the room allocation exclusion constraint.

## Not yet done
These migrations are source code only. They have not been executed against a database, and no database provider has been connected.

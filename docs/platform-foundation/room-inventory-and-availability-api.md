# Room inventory and availability API

These endpoints are authenticated hotel-staff operations APIs. They resolve the signed-in Supabase Auth identity, load the current active property membership, authorize `rooms:read`, and scope every database query to that property. The service-role client is used only in server code; it bypasses RLS and therefore must remain behind these checks.

## Inventory

`GET /api/operations/rooms`

Returns configured room categories, room records, category room counts, and total configured/active-bookable room counts for the caller's assigned property. Room numbers are operational data for Owner/Manager only. No guest identity or contact fields are selected.

If no rooms have been configured, the response explicitly reports `inventory_not_configured`; no default 40-room seed or category split is fabricated.

## Availability

`GET /api/operations/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD`

Requires a valid half-open date interval. A room is counted available only when it is active and bookable, its category is bookable, and it has no overlapping allocation with status `HELD`, `CONFIRMED`, or `CHECKED_IN`. The overlap predicate is `allocation.check_in < requested.check_out AND allocation.check_out > requested.check_in`, matching the database's `[check_in, check_out)` allocation convention.

Expired HELD allocations remain blocking until the trusted hold-expiry worker transitions them to RELEASED. The API does not create reservations, issue holds, quote prices, or promise a booking. It returns counts by category and no room/guest PII.

## Known next steps

- Add a transactional reservation/hold command with idempotency and locking; availability reads alone cannot prevent concurrent booking races.
- Add a trusted hold-expiry worker.
- Add room inventory management commands with audit events and owner/manager policy checks.
- Confirm hotel room/category records and operational statuses with the property before seeding.

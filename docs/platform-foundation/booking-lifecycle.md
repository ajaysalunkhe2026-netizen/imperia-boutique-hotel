# Reservation and Payment Lifecycle — Foundation v1

## Reservation states
- `DRAFT`: guest is preparing a request; no inventory is held.
- `PENDING`: reservation request created; confirmation is still pending.
- `HELD`: inventory is temporarily held with an explicit expiry.
- `CONFIRMED`: reservation is accepted and inventory is committed.
- `CHECKED_IN`: guest has checked in.
- `CHECKED_OUT`: stay is complete.
- `CANCELLED`: reservation cancelled under the applicable policy.
- `NO_SHOW`: guest did not arrive under the hotel's approved policy.

Only valid, explicitly coded transitions are allowed. Every transition records actor, time and reason.

## Payment states (independent from reservation state)
- `NOT_REQUIRED`
- `PENDING`
- `AUTHORIZED`
- `PAID`
- `FAILED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

A payment callback must be authenticated and idempotent. Never mark a reservation paid from a browser redirect alone. Verify the gateway signature/server-side status.

## Inventory safety
- Availability is calculated for the requested stay dates, not by a simple current room status.
- A room cannot have overlapping active allocations.
- Allocation and reservation confirmation run in a database transaction.
- Concurrent booking attempts must be tested.
- Temporary holds expire automatically and release inventory.
- Maintenance blocks are distinct from guest reservations.
- A manager can assign a specific room to a category reservation, subject to availability.

## Customer journey
1. Select check-in, check-out, guests and room quantity.
2. Query available categories/quantity for the entire date range.
3. Display only confirmed, configured room facts and rates.
4. Capture guest details and consent.
5. Create pending/held reservation according to the hotel-approved policy.
6. Collect online payment or record pay-at-hotel intent if enabled.
7. Confirm only after the configured confirmation rule succeeds.
8. Send confirmation and expose the reservation to the manager dashboard.
9. Manager assigns room and performs check-in/check-out.
10. Cancellation, refund and no-show follow the hotel-approved policies.

## Business rules still requiring owner approval
- Whether bookings auto-confirm or require manager approval.
- Whether online payment, pay-at-hotel or both are offered.
- Hold duration, deposit, tax and fee rules.
- Cancellation, refund and no-show policy.
- Check-in/check-out times and early/late rules.
- Guest and room occupancy limits.

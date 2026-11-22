# Transactional booking holds

## Create a temporary hold

`POST /api/guest/booking-holds`

The caller must be signed in with a verified Supabase Auth identity mapped to an active application user and a guest profile for the requested property. The property and category IDs are validated; guest identity is resolved from the authenticated principal and never accepted from the request body.

Request JSON:

```json
{
  "property_id": "property UUID",
  "category_id": "bookable category UUID",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "adults": 2,
  "children": 0,
  "idempotency_key": "client-generated UUID"
}
```

The database function creates a 10-minute HELD reservation and one HELD room allocation in a single transaction. It locks candidate room rows, serializes same-property/category/date selection, and relies on the allocation exclusion constraint as a final overlap guard. Repeated requests with the same property, guest and idempotency key return the original reservation identifier instead of creating a duplicate.

The API returns only the reservation identifier/code, hold expiry and replay indicator. It does not return guest PII or payment data.

## Important limits

- This is a temporary room hold, not a confirmed booking. Payment, confirmation, cancellation and check-in/out are not implemented by this endpoint.
- A trusted expiry worker must release expired HELD allocations and transition their reservations according to an approved lifecycle policy. Until that worker exists, expired holds continue to block availability; the endpoint intentionally does not silently treat wall-clock expiry as release.
- A price quote is not created because room rates, tax rules and inclusions have not been supplied/approved.
- Guest accounts must be linked to a guest profile by trusted provisioning. The endpoint does not create or modify identity records.
- The SQL function is executable only by Supabase service_role. Never expose the service key or invoke this function directly from browser code.

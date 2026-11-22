# Server-side authorization policy

## Implemented

- `lib/authz/policy.mjs` is a pure, deny-by-default authorization decision function.
- `lib/authz/policy.d.ts` provides TypeScript types.
- `lib/authz/policy.test.mjs` tests role boundaries, property isolation, guest ownership, aggregate Platform Admin reporting, inactive memberships and unknown permissions.
- Permission arrays are frozen at runtime; callers should use `authorize()` rather than mutate permission data.

## Trust boundary — critical

The policy function does not authenticate a user. Its principal MUST be constructed on the server from a verified Supabase Auth user and current database assignments. Never construct it from a request body, query parameter, client-side role, or untrusted header.

Call authorization inside every server route/action before reading or mutating protected data. For guest resource access, load the resource under the requested property scope and pass its verified owner user ID to the policy.

## Role boundaries

- Platform Admin: platform operations, diagnostics, and explicit aggregate business/revenue/commission reporting only. No raw reservation, guest or payment row access; no booking, rate, payment, hotel-record or staff-permission changes.
- Hotel Owner: hotel business data and owner-level reports within the assigned property, subject to approved workflows.
- Hotel Manager: daily reservation and room operations within assigned permissions; no business revenue reports or refund approvals.
- Guest: own reservation/payment/profile permissions only, with ownership checked against trusted database records.

## Platform Admin report permissions

- `reports:business:aggregate:read`
- `reports:revenue:aggregate:read`
- `reports:commission:read`

These permissions are policy gates only. A future reporting endpoint must use restricted aggregate SQL/views/RPCs and must not query or return guest names, phone numbers, email addresses, private requests, documents, or raw booking/payment records.

## Limitations and next integration gate

- The policy is not a substitute for database RLS or data-layer filtering.
- No booking/payment/reporting API is implemented yet.
- The commission schema is not implemented. The proposed 15% gross commission is pending written hotel-owner approval and precise gross/refund definitions.
- Add route-level integration tests and database RLS tests before exposing dashboards or booking management.

# Server-side authorization policy

## Implemented in this change
- `lib/authz/policy.mjs` is a pure, deny-by-default authorization decision function.
- `lib/authz/policy.d.ts` provides TypeScript types for application integration.
- `lib/authz/policy.test.mjs` covers role boundaries, property isolation, guest ownership, inactive memberships, and unknown permissions.

## Trust boundary — critical
The policy function does not authenticate a user and does not create a session. Its `principal` input MUST be constructed on the server from a verified authentication session and current database membership records. Never construct it from a request body, query parameter, client-side role, or untrusted header.

Call authorization inside every server route/action before reading or mutating protected data. For guest resource access, load the resource under the requested property scope and pass its verified owner user ID to the policy. Do not trust an owner ID supplied by the browser.

## Role boundaries
- Platform admin: platform operations and diagnostics; no automatic hotel financial, booking, or business-report access.
- Hotel owner: hotel-level reports and approved business authority within the exact property membership.
- Hotel manager: reservation and room operations; no business financial reports or refund approval.
- Guest: own reservation/payment/profile permissions only, with resource ownership checked.

## Limitations and next integration gate
- No authentication provider, login UI, session cookie, password handling, route middleware, or database membership adapter is implemented by this policy-only change.
- This module is not yet wired into public website routes or dashboards. It is a tested policy core, not a complete access-control deployment.
- Final owner/manager authority boundaries (especially pricing, refunds, cancellation overrides, and staff administration) require hotel owner approval.
- Add route-level integration tests and security review before exposing dashboards or booking management.

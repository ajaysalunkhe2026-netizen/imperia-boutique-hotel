# IMPERIA Digital Hotel Platform — Foundation v1

Status: development foundation; not approved for production.

## Product scope

A single-hotel platform with four interfaces:
- Guest website and booking journey
- Owner business dashboard
- Manager operations dashboard
- Platform administrator dashboard

All interfaces use one backend and one PostgreSQL source of truth. Access is role- and permission-controlled.

## Confirmed inputs

- Property: IMPERIA BOUTIQUE HOTEL, Rabale, Navi Mumbai.
- Total inventory: 40 rooms (user-provided; exact room register still required).
- User-described room categories: Normal, Deluxe and Premium.
- Category counts, room numbers and operational status have not been supplied as a verified room register.

## Unconfirmed — do not publish or seed as fact

- Exact category counts, room numbers, room features, amenities, occupancy limits and photos.
- Room rates, taxes, deposits, cancellation/no-show policies.
- Payment-at-hotel and online-payment rules.
- Owner/manager identities and permissions.
- Whether booking is auto-confirmed or requires manager approval.
- Commission agreement execution, gross-revenue definition, refund treatment and payout terms.

## Architecture decisions

1. Start as a modular monolith, not microservices.
2. Next.js application and API routes for the first release.
3. PostgreSQL as the authoritative transactional database.
4. Server-side authorization on every protected operation.
5. Booking inventory protected by database transactions and overlap constraints.
6. Payment state is separate from reservation state.
7. Record audit events for sensitive administrative and booking changes.
8. Separate local, staging and production environments.
9. Do not replace or alter the current live website until staging passes acceptance tests and owner approval is obtained.
10. RLS is default-deny until granular policies are implemented and tested.

## Current implementation status

- Public hotel website and section pages exist on the main website line.
- Supabase client foundation, principal resolver and pure authorization policy exist.
- Initial schema and default-deny RLS migrations exist as source files.
- No live booking/payment APIs, role dashboards, reporting endpoints or commission ledger are implemented.
- No migration has been applied to Supabase and no production release is authorized.

## Next engineering gate

Complete granular RLS policies, trusted account provisioning, protected dashboards, transactional booking APIs, payment webhook verification and integration tests. No real room inventory, pricing or payment credentials should be inserted until hotel management confirms them.

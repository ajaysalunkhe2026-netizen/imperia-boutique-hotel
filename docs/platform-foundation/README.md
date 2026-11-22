# IMPERIA Digital Hotel Platform — Foundation v1

Status: architecture baseline; implementation not yet authorized for production.

## Product scope
A single-hotel platform for IMPERIA BOUTIQUE HOTEL with four interfaces:
- Guest website and booking journey
- Owner business dashboard
- Manager operations dashboard
- Platform administrator dashboard

All interfaces use one backend and one PostgreSQL source of truth. Access is role- and permission-controlled.

## Confirmed inputs
- Property: IMPERIA BOUTIQUE HOTEL, Rabale, Navi Mumbai.
- Total inventory: 40 rooms.
- User-described room categories include Normal, Deluxe and Premium.
- A fourth category was proposed as Executive, but hotel management has not confirmed the name.
- The user has a Vercel Hobby plan and intends to defer any plan change for about 15 days.
- Existing website repository uses Next.js, React and TypeScript.

## Unconfirmed — do not publish or seed as fact
- Exact category names and counts (the current 10/10/10/10 split is a planning assumption).
- Room numbers, room features, amenities, occupancy limits and photos.
- Room rates, taxes, deposits, cancellation/no-show policies.
- Payment-at-hotel and online-payment rules.
- Owner/manager identities and permissions.
- Whether booking is auto-confirmed or requires manager approval.

## Architecture decisions
1. Start as a modular monolith, not microservices.
2. Next.js application and API routes for the first release.
3. PostgreSQL as the authoritative transactional database.
4. Server-side authorization on every protected operation.
5. Booking inventory protected by database transactions and overlap constraints.
6. Payment state is separate from reservation state.
7. Record audit events for sensitive administrative and booking changes.
8. Separate local, staging and production environments.
9. Do not connect a commercial production workflow to Vercel Hobby.
10. Do not replace or alter the current live website until staging passes acceptance tests and owner approval is obtained.

## Initial modules
- Identity and access control
- Property and room inventory
- Guests and reservations
- Payments and refunds
- Hotel operations (check-in/out, housekeeping, maintenance)
- Website content and SEO
- Analytics and reporting
- Audit trail and notifications

## Next engineering gate
Approve the domain model and business rules, then implement database migrations and tests. No real room inventory, pricing or payment credentials should be inserted until hotel management confirms them.

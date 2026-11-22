# Authentication Provider Evaluation — ADR 0003

Status: technical recommendation; final service activation requires hotel-owner approval and a Supabase project owned/approved for IMPERIA.

## Decision

**Recommend Supabase Auth with `@supabase/ssr` for the first implementation**, while keeping hotel authorization in the application's own PostgreSQL tables and policy layer.

This is a recommendation, not an activated integration. Do not create a hosted project, select a paid plan, add credentials, or enable login until the owner approves the provider, billing owner, privacy terms, and environment.

## Why this fits this project

- The platform already selected PostgreSQL as its transactional source of truth. Supabase Auth stores its identity records in a dedicated schema in the same Postgres project, while application tables can map the immutable Auth user ID to `app_users`.
- The application uses Next.js 16 App Router. Supabase documents cookie-based SSR integration using `@supabase/ssr`; its current guidance explicitly notes that Next.js 16 uses `proxy.ts` where earlier Next.js versions used `middleware.ts`.
- Supabase provides email/password, magic link, OTP, social sign-in and MFA capabilities. This avoids building credential storage, password recovery, token rotation and MFA from scratch.
- Supabase Auth can be used with application-owned authorization. Do not place hotel roles or property permissions in user-editable metadata or rely on JWT role claims as the sole source of access decisions.

## Comparison

| Area | Supabase Auth | Auth.js |
|---|---|---|
| Core role | Managed identity/auth service | Authentication library integrated into the app |
| PostgreSQL fit | Auth records live in Supabase-managed Postgres schema; app can map Auth user UUID to local user | Can use a supported adapter (e.g. Drizzle/Prisma) to persist users/accounts/sessions in app database |
| Next.js 16 SSR | Official `@supabase/ssr` cookie-based guidance and Next.js App Router quickstart | Official Next.js integration; session and adapter configuration are app responsibilities |
| Login methods | Password, magic link, OTP, OAuth, MFA | OAuth, email magic links, Credentials integration, WebAuthn/passkeys; feature depends on configured provider |
| Operational work | Less custom identity/session infrastructure; provider-managed service and project | More control, but app team owns more provider setup, adapter, email delivery, credentials verification and operational hardening |
| Vendor coupling | Higher: Supabase Auth and project ecosystem | Lower: library-based, database/provider choice more flexible |
| Cost | Free tier exists; production needs careful evaluation of limits, backups and pause behavior. Current public pricing lists Pro from $25/month | Library itself is open source; actual costs depend on database, email/OAuth providers, hosting and operations |
| Best fit here | Fastest coherent path if adopting Supabase Postgres for the platform | Better if the team wants to own the full identity/session stack or use a separate managed PostgreSQL provider |

## Important pricing and production caveat

The Supabase pricing page currently lists Free at $0 with 50,000 MAU and 500 MB database, but free projects pause after one week of inactivity and have no automatic backups. Pro currently starts at $25/month and includes daily backups retained for 7 days, subject to usage and add-ons. Pricing can change; re-check before approval. A free project is suitable for evaluation/development only, not the intended live hotel booking system.

## Recommended implementation model

1. Use Supabase Auth only for authentication and identity lifecycle.
2. Use the provider's immutable Auth user UUID as the external identity key; map it to one local `app_users.id` through an `auth_identities` table. Do not use email as the identity key.
3. Keep `properties`, `property_memberships`, and business permissions in application-owned tables.
4. Keep the authorization policy in `lib/authz/policy.mjs`; build the principal on the server by verifying the Supabase session and loading current local account/membership rows from PostgreSQL.
5. Add a separate global platform-admin assignment table/model. The current `property_memberships` table is property-scoped and excludes guests; it must not be overloaded to model global platform administration.
6. Use `@supabase/ssr` with cookie-based sessions and the Next.js 16 `proxy.ts` refresh pattern. Follow current official guidance for server-side identity verification; do not trust a decoded, unverified JWT or browser-supplied role.
7. Use Row Level Security as an additional database boundary if the application accesses Supabase Data APIs directly. Server-side policy checks remain mandatory; never expose service-role credentials to the browser.
8. Require MFA for platform admins and hotel owners before production. Decide manager MFA and guest authentication UX with the owner.
9. Add tests for disabled local users, revoked sessions, changed memberships, cross-property access, guest ownership, and unauthorized direct data access.

## Why not select Auth.js as the default now?

Auth.js is a credible option and avoids locking identity into a managed database/auth vendor. However, it does not remove the need to choose and operate the database adapter, email delivery, account recovery, MFA/passkey configuration, and session persistence strategy. For this single-property first release, the existing PostgreSQL-first direction and need to move safely from architecture into implementation make Supabase Auth the lower-integration-cost recommendation.

Choose Auth.js instead if the hotel/platform owner explicitly prefers an independent PostgreSQL provider and is willing to own the additional authentication integration and operations.

## Approval required before implementation

- Confirm Supabase as the identity provider and whether its Postgres database will also host the platform's transactional tables.
- Confirm who owns and pays for the project (hotel vs platform operator).
- Approve plan and monthly budget; do not assume Free tier is acceptable for production.
- Approve identity methods: staff email/password or magic link, MFA policy, and guest booking identity flow.
- Approve privacy/data processing terms and account recovery contact.

## Sources reviewed

- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase Next.js SSR quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase SSR server-side session guidance: https://supabase.com/docs/guides/auth/server-side
- Supabase pricing: https://supabase.com/pricing
- Auth.js getting started and supported authentication methods: https://authjs.dev/getting-started
- Auth.js Credentials provider limitations: https://authjs.dev/getting-started/authentication/credentials

# Deployment and Environments — Foundation v1

## Environments
- Local: developer machines; synthetic data only.
- Staging: isolated test deployment and non-production database.
- Production: real guest and hotel data; enabled only after commercial hosting, security review and owner acceptance.

## Current hosting constraint
The project currently has a Vercel Hobby account. Hobby is not the target for commercial hotel operations. Development can proceed locally while the hosting decision is deferred. Before any commercial production deployment, move to a plan/provider whose terms permit the intended commercial use.

## Proposed initial production topology
- Next.js application/API: Vercel commercial plan or another suitable commercial host.
- PostgreSQL: managed PostgreSQL provider with backups and point-in-time recovery appropriate to the business.
- Object storage: private/public buckets with controlled upload policies for hotel media.
- Payment gateway: provider account owned/approved by the hotel; secrets only in server-side environment variables.
- Email/SMS/WhatsApp: transactional provider selected after owner approval.

## Release gates
1. CI passes lint, typecheck, tests and production build.
2. Database migrations reviewed and tested against staging.
3. Authentication, authorization and tenant/property scoping tests pass.
4. Booking concurrency and payment webhook idempotency tests pass.
5. Backup restore procedure is demonstrated.
6. Privacy notice, terms, cancellation policy and payment disclosures are approved.
7. Owner accepts the staging system.
8. Production domain and DNS are changed only with explicit approval and rollback plan.

Never place secrets in Git. Never use production guest data in local or staging environments.

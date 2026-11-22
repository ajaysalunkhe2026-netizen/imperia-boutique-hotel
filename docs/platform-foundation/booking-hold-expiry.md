# Temporary hold expiry worker

## Endpoint

`POST /api/internal/expire-booking-holds`

The endpoint is intended for a scheduler (for example, Vercel Cron) and requires the exact `Authorization: Bearer <CRON_SECRET>` header. Set `CRON_SECRET` as a server-only environment variable; never expose it to browser code.

Each invocation processes at most 100 expired HELD reservations. The database function selects rows whose `hold_expires_at` has passed, locks them with `FOR UPDATE SKIP LOCKED`, and transitions them to `CANCELLED`. The existing reservation lifecycle trigger then transitions their active room allocations to `CANCELLED` in the same transaction. Concurrent invocations can safely process separate batches.

Response: `{"expired_holds": number}`.

## Operational requirements

- Apply reviewed migrations 0001–0007 to the intended Supabase project before enabling the schedule.
- Configure a scheduler to POST the endpoint periodically and provide CRON_SECRET.
- Monitor non-2xx responses and the expired_holds count.
- This worker does not charge, refund, or confirm payments. Payment lifecycle remains separate.
- The worker is deliberately not enabled by a schedule in this code change; configure cadence after the hotel approves the operational hold policy.

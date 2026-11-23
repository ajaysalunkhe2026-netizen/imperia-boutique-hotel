# Reservation Requests — Go-Live Runbook

This release adds a reservation enquiry workflow. It does **not** confirm bookings, reserve inventory, collect payments, or calculate tariffs.

## Before enabling the form in production

1. In the production Supabase project used by this Vercel deployment, apply:
   `supabase/migrations/202611230001_create_reservation_requests.sql`.
2. Confirm the Vercel Production environment has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Configure reservation notification environment variables in Vercel:
   - `RESEND_API_KEY`, `RESERVATION_FROM_EMAIL` (a sender/domain verified with Resend), and optionally `RESERVATION_NOTIFY_EMAIL` (defaults to the hotel's published email).
   - For WhatsApp Cloud API: `WHATSAPP_CLOUD_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_TO` (comma-separated E.164 digits for owner/manager), `WHATSAPP_TEMPLATE_NAME`, and optionally `WHATSAPP_TEMPLATE_LANGUAGE` (defaults to `en`).
   - The approved WhatsApp template must be a utility template with five body placeholders in this order: request reference, guest name, stay dates/nights, guest/room summary, guest mobile.
4. Redeploy only after the migration and provider settings are verified.
5. Submit a controlled test enquiry using a hotel-approved test contact. Confirm one row is inserted into `public.reservation_requests` with `status = 'pending'`.
6. Confirm the email arrives and the WhatsApp template is delivered to each configured recipient. Provider acceptance is not proof of end-device delivery.
7. Delete the test row through an authorized Supabase operator workflow after verification.

## Guest-facing behavior

- Guests select check-in/check-out dates, adults, children, rooms and a preferred room category.
- The form collects lead-guest contact details and optional notes.
- A successful submission returns a request reference.
- The confirmation explicitly says this is an enquiry, not a confirmed reservation. Hotel staff must verify availability, tariff, taxes and inclusions.

## Operational controls and known limitations

- Public clients have INSERT-only RLS access; public SELECT/UPDATE/DELETE is not granted.
- Do not expose the Supabase service-role key in browser code or public environment variables.
- Email and WhatsApp Cloud API notifications are now supported when correctly configured. Notifications are best-effort after the enquiry is safely stored; provider failure does not discard the enquiry.
- This release does not include a staff dashboard, staff login/roles, SMS, rate limiting, PMS/channel-manager integration, live inventory, tariff calculation or payment processing.
- WhatsApp requires an approved Meta message template for business-initiated notifications. Do not attempt to send unapproved free-form messages.
- Until staff access and notification delivery are implemented and tested, the hotel must monitor pending requests through an authorized Supabase operator workflow. Do not advertise instant booking confirmation.
- Add edge/WAF rate limiting and abuse monitoring before promoting the form at scale.

## Smoke-test checklist

- [ ] Future check-in and later check-out accepted.
- [ ] Same-day checkout, past dates, invalid calendar dates and stays over 30 nights rejected.
- [ ] Guest and room bounds enforced server-side.
- [ ] Invalid email/phone and oversized notes rejected.
- [ ] Honeypot submissions do not create database rows.
- [ ] Valid request creates exactly one pending row and returns a reference.
- [ ] Public anonymous role cannot read, update or delete reservation rows.
- [ ] Mobile layout and keyboard date/select controls verified on physical devices.

## Release gate

Do not call this a live booking engine until inventory, tariff, staff workflow, notification delivery and end-to-end production tests have been completed.

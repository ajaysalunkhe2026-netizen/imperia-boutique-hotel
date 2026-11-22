-- Imperia Boutique Hotel
-- Security baseline: enable RLS on every application table.
-- No client-facing policies are added in this migration. This is intentional:
-- Supabase anon/authenticated clients receive no table access until a later
-- reviewed policy migration is implemented. Trusted server code using the
-- secret/service key bypasses RLS and must perform explicit authorization.
--
-- Apply after 0001_initial_schema.sql and 0002_auth_identity_and_platform_admin.sql.

BEGIN;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_assignments ENABLE ROW LEVEL SECURITY;

COMMIT;

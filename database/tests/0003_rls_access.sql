-- RLS regression tests for migration 0005.
-- CI uses disposable PostgreSQL roles and a test-only auth.uid() implementation.
-- All fixture rows are rolled back.

BEGIN;

DO $$
DECLARE
  property_id uuid;
  other_property_id uuid;
  owner_app_id uuid;
  manager_app_id uuid;
  guest_app_id uuid;
  admin_app_id uuid;
  other_guest_app_id uuid;
  owner_auth_id uuid := gen_random_uuid();
  manager_auth_id uuid := gen_random_uuid();
  guest_auth_id uuid := gen_random_uuid();
  admin_auth_id uuid := gen_random_uuid();
  other_guest_auth_id uuid := gen_random_uuid();
  guest_id uuid;
  other_guest_id uuid;
  category_id uuid;
  room_id uuid;
  reservation_id uuid;
  other_reservation_id uuid;
  payment_id uuid;
BEGIN
  INSERT INTO public.properties (name, slug)
  VALUES ('RLS Test Property', 'rls-test-property')
  RETURNING id INTO property_id;

  INSERT INTO public.properties (name, slug)
  VALUES ('RLS Other Property', 'rls-other-property')
  RETURNING id INTO other_property_id;

  INSERT INTO auth.users (id) VALUES
    (owner_auth_id), (manager_auth_id), (guest_auth_id),
    (admin_auth_id), (other_guest_auth_id);

  INSERT INTO public.app_users (auth_user_id, email, full_name)
  VALUES (owner_auth_id, 'rls-owner@example.invalid', 'RLS Owner')
  RETURNING id INTO owner_app_id;

  INSERT INTO public.app_users (auth_user_id, email, full_name)
  VALUES (manager_auth_id, 'rls-manager@example.invalid', 'RLS Manager')
  RETURNING id INTO manager_app_id;

  INSERT INTO public.app_users (auth_user_id, email, full_name)
  VALUES (guest_auth_id, 'rls-guest@example.invalid', 'RLS Guest')
  RETURNING id INTO guest_app_id;

  INSERT INTO public.app_users (auth_user_id, email, full_name)
  VALUES (admin_auth_id, 'rls-admin@example.invalid', 'RLS Platform Admin')
  RETURNING id INTO admin_app_id;

  INSERT INTO public.app_users (auth_user_id, email, full_name)
  VALUES (other_guest_auth_id, 'rls-other@example.invalid', 'RLS Other Guest')
  RETURNING id INTO other_guest_app_id;

  INSERT INTO public.property_memberships (property_id, user_id, role)
  VALUES
    (property_id, owner_app_id, 'hotel_owner'),
    (property_id, manager_app_id, 'hotel_manager');

  INSERT INTO public.platform_admin_assignments (user_id, reason)
  VALUES (admin_app_id, 'RLS isolation test');

  INSERT INTO public.guests (property_id, user_id, full_name, email, phone)
  VALUES (property_id, guest_app_id, 'RLS Guest', 'rls-guest@example.invalid', '+910000000001')
  RETURNING id INTO guest_id;

  INSERT INTO public.guests (property_id, user_id, full_name, email, phone)
  VALUES (other_property_id, other_guest_app_id, 'Other Guest', 'rls-other@example.invalid', '+910000000002')
  RETURNING id INTO other_guest_id;

  INSERT INTO public.room_categories (property_id, name, is_bookable)
  VALUES (property_id, 'RLS Category', true)
  RETURNING id INTO category_id;

  INSERT INTO public.rooms (property_id, category_id, room_number, is_bookable)
  VALUES (property_id, category_id, 'RLS-01', true)
  RETURNING id INTO room_id;

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status,
    check_in, check_out, currency_code
  ) VALUES (
    property_id, guest_id, 'RLS-BOOKING-1', 'CONFIRMED',
    DATE '2031-02-01', DATE '2031-02-03', 'INR'
  ) RETURNING id INTO reservation_id;

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status,
    check_in, check_out, currency_code
  ) VALUES (
    other_property_id, other_guest_id, 'RLS-BOOKING-2', 'CONFIRMED',
    DATE '2031-02-01', DATE '2031-02-03', 'INR'
  ) RETURNING id INTO other_reservation_id;

  INSERT INTO public.payments (
    property_id, reservation_id, provider, amount_minor, currency_code
  ) VALUES (
    property_id, reservation_id, 'test-provider', 10000, 'INR'
  ) RETURNING id INTO payment_id;

  PERFORM set_config('test.owner_auth_id', owner_auth_id::text, true);
  PERFORM set_config('test.manager_auth_id', manager_auth_id::text, true);
  PERFORM set_config('test.guest_auth_id', guest_auth_id::text, true);
  PERFORM set_config('test.admin_auth_id', admin_auth_id::text, true);
  PERFORM set_config('test.unmapped_auth_id', gen_random_uuid()::text, true);
END;
$$;

-- Owner: sees only assigned property data, including reservation/payment rows.
SELECT set_config('request.jwt.claim.sub', current_setting('test.owner_auth_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.properties;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: owner property isolation: %', n; END IF;
  SELECT count(*) INTO n FROM public.reservations;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: owner reservation visibility: %', n; END IF;
  SELECT count(*) INTO n FROM public.payments;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: owner payment visibility: %', n; END IF;
END;
$$;
RESET ROLE;

-- Manager: operational reservation/guest access, no raw payment table access.
SELECT set_config('request.jwt.claim.sub', current_setting('test.manager_auth_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reservations;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: manager reservation visibility: %', n; END IF;
  SELECT count(*) INTO n FROM public.payments;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS TEST FAILED: manager sees raw payment rows: %', n; END IF;
END;
$$;
RESET ROLE;

-- Guest: sees only own reservation and own guest profile.
SELECT set_config('request.jwt.claim.sub', current_setting('test.guest_auth_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reservations;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: guest reservation ownership: %', n; END IF;
  SELECT count(*) INTO n FROM public.guests;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS TEST FAILED: guest profile ownership: %', n; END IF;
END;
$$;
RESET ROLE;

-- Platform Admin: no raw reservations or guest profiles and no payment grant.
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin_auth_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reservations;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS TEST FAILED: Platform Admin sees raw reservations'; END IF;
  SELECT count(*) INTO n FROM public.guests;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS TEST FAILED: Platform Admin sees guest profiles'; END IF;
  SELECT count(*) INTO n FROM public.payments;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS TEST FAILED: Platform Admin sees raw payment rows: %', n; END IF;
END;
$$;
RESET ROLE;

-- Unmapped identity: no application data is visible.
SELECT set_config('request.jwt.claim.sub', current_setting('test.unmapped_auth_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reservations;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS TEST FAILED: unmapped identity sees reservations'; END IF;
END;
$$;
RESET ROLE;


-- Table-level privileges are part of the boundary, not just row policies.
-- Authenticated users get SELECT only on approved tables; anonymous users
-- get no application-table access. Webhook events and admin assignments are
-- never exposed directly to either API role.
DO $privcheck$
DECLARE
  table_name text;
  write_privilege text;
  protected_tables text[] := ARRAY[
    'properties', 'app_users', 'property_memberships', 'guests',
    'room_categories', 'rooms', 'reservations', 'room_allocations',
    'payments', 'payment_webhook_events', 'audit_logs',
    'platform_admin_assignments'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT') THEN
      RAISE EXCEPTION 'RLS TEST FAILED: anon can SELECT public.%', table_name;
    END IF;

    FOREACH write_privilege IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege('authenticated', format('public.%I', table_name), write_privilege) THEN
        RAISE EXCEPTION 'RLS TEST FAILED: authenticated has % on public.%', write_privilege, table_name;
      END IF;
      IF has_table_privilege('anon', format('public.%I', table_name), write_privilege) THEN
        RAISE EXCEPTION 'RLS TEST FAILED: anon has % on public.%', write_privilege, table_name;
      END IF;
    END LOOP;
  END LOOP;

  IF has_table_privilege('authenticated', 'public.payment_webhook_events', 'SELECT') THEN
    RAISE EXCEPTION 'RLS TEST FAILED: authenticated can read webhook events';
  END IF;
  IF has_table_privilege('authenticated', 'public.platform_admin_assignments', 'SELECT') THEN
    RAISE EXCEPTION 'RLS TEST FAILED: authenticated can read admin assignment history';
  END IF;
  RAISE NOTICE 'PASS: anonymous denial, authenticated read-only grants, and protected internal tables.';
END;
$privcheck$;

ROLLBACK;

-- Imperia Boutique Hotel
-- Phase 1 booking-integrity regression tests.
-- Requires migrations 0001 through 0004.
-- Run against a disposable database as a role that can create fixture rows.
-- All fixture data is rolled back.

BEGIN;

DO $$
DECLARE
  p uuid;
  u uuid;
  g uuid;
  c uuid;
  r uuid;
  booking uuid;
  booking_two uuid;
  allocation uuid;
  payment uuid;
  event_id uuid;
  admin_assignment uuid;
  rejected boolean;
  old_updated_at timestamptz;
BEGIN
  INSERT INTO public.properties (name, slug)
  VALUES ('Integrity Test Property', 'integrity-test-property')
  RETURNING id INTO p;

  INSERT INTO public.app_users (email, full_name)
  VALUES ('integrity-guest@example.invalid', 'Integrity Guest')
  RETURNING id INTO u;

  INSERT INTO public.guests (property_id, user_id, full_name, email)
  VALUES (p, u, 'Integrity Guest', 'integrity-guest@example.invalid')
  RETURNING id INTO g;

  INSERT INTO public.room_categories (property_id, name, is_bookable)
  VALUES (p, 'Integrity Category', true)
  RETURNING id INTO c;

  INSERT INTO public.rooms (property_id, category_id, room_number, is_bookable)
  VALUES (p, c, 'I-01', true)
  RETURNING id INTO r;

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status,
    check_in, check_out, currency_code
  ) VALUES (
    p, g, 'INTEGRITY-001', 'CONFIRMED',
    DATE '2030-01-10', DATE '2030-01-14', 'INR'
  ) RETURNING id INTO booking;

  INSERT INTO public.room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (
    p, booking, r, DATE '2030-01-10', DATE '2030-01-12', 'CONFIRMED'
  ) RETURNING id INTO allocation;

  -- 1. Reservation dates cannot be narrowed around an active allocation.
  rejected := false;
  BEGIN
    UPDATE public.reservations
    SET check_in = DATE '2030-01-11'
    WHERE id = booking;
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: reservation date edit invalidated an active allocation';
  END IF;

  -- 2. A room with an active allocation cannot be disabled.
  rejected := false;
  BEGIN
    UPDATE public.rooms SET is_bookable = false WHERE id = r;
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: room was disabled while an active allocation existed';
  END IF;

  -- 3. A category with an active allocation cannot be disabled.
  rejected := false;
  BEGIN
    UPDATE public.room_categories SET is_bookable = false WHERE id = c;
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: category was disabled while an active allocation existed';
  END IF;

  -- 4. Cancelling a reservation releases its active allocation atomically.
  UPDATE public.reservations SET status = 'CANCELLED' WHERE id = booking;
  IF (SELECT status FROM public.room_allocations WHERE id = allocation) <> 'CANCELLED' THEN
    RAISE EXCEPTION 'TEST FAILED: cancellation did not cancel active allocation';
  END IF;

  -- 5. A non-bookable room cannot receive a new active allocation.
  UPDATE public.rooms SET is_bookable = false WHERE id = r;

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status,
    check_in, check_out, currency_code
  ) VALUES (
    p, g, 'INTEGRITY-002', 'CONFIRMED',
    DATE '2030-01-12', DATE '2030-01-14', 'INR'
  ) RETURNING id INTO booking_two;

  rejected := false;
  BEGIN
    INSERT INTO public.room_allocations (
      property_id, reservation_id, room_id, check_in, check_out, status
    ) VALUES (
      p, booking_two, r, DATE '2030-01-12', DATE '2030-01-14', 'CONFIRMED'
    );
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: allocation accepted for non-bookable room';
  END IF;

  UPDATE public.rooms SET is_bookable = true WHERE id = r;

  -- 6. A non-bookable category cannot receive a new active allocation.
  UPDATE public.room_categories SET is_bookable = false WHERE id = c;
  rejected := false;
  BEGIN
    INSERT INTO public.room_allocations (
      property_id, reservation_id, room_id, check_in, check_out, status
    ) VALUES (
      p, booking_two, r, DATE '2030-01-12', DATE '2030-01-14', 'CONFIRMED'
    );
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: allocation accepted for non-bookable category';
  END IF;
  UPDATE public.room_categories SET is_bookable = true WHERE id = c;

  -- Create a valid allocation for the checkout lifecycle test.
  INSERT INTO public.room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (
    p, booking_two, r, DATE '2030-01-12', DATE '2030-01-14', 'CONFIRMED'
  ) RETURNING id INTO allocation;

  -- 7. Check-out releases checked-in allocations.
  UPDATE public.room_allocations
  SET status = 'CHECKED_IN'
  WHERE id = allocation;
  UPDATE public.reservations
  SET status = 'CHECKED_IN'
  WHERE id = booking_two;
  UPDATE public.reservations
  SET status = 'CHECKED_OUT'
  WHERE id = booking_two;
  IF EXISTS (
    SELECT 1 FROM public.room_allocations
    WHERE reservation_id = booking_two AND status <> 'RELEASED'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: check-out did not release room allocation';
  END IF;

  -- 8. Webhook provider must match the payment provider.
  INSERT INTO public.payments (
    property_id, reservation_id, provider, amount_minor, currency_code
  ) VALUES (
    p, booking_two, 'razorpay', 10000, 'INR'
  ) RETURNING id INTO payment;

  rejected := false;
  BEGIN
    INSERT INTO public.payment_webhook_events (
      payment_id, provider, provider_event_id, event_type, signature_verified
    ) VALUES (
      payment, 'other-provider', 'evt-mismatch', 'payment.captured', true
    );
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: mismatched webhook provider was accepted';
  END IF;

  -- 9. An event cannot be marked processed before signature verification.
  rejected := false;
  BEGIN
    INSERT INTO public.payment_webhook_events (
      payment_id, provider, provider_event_id, event_type,
      signature_verified, processed_at
    ) VALUES (
      payment, 'razorpay', 'evt-unverified', 'payment.captured',
      false, statement_timestamp()
    );
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: unverified webhook was marked processed';
  END IF;

  INSERT INTO public.payment_webhook_events (
    payment_id, provider, provider_event_id, event_type,
    signature_verified, processed_at
  ) VALUES (
    payment, 'razorpay', 'evt-valid', 'payment.captured',
    true, statement_timestamp()
  ) RETURNING id INTO event_id;

  -- 10. Audit records cannot be updated or deleted.
  INSERT INTO public.audit_logs (
    property_id, actor_user_id, action, target_type, outcome
  ) VALUES (p, u, 'integrity.test', 'test', 'SUCCESS');

  rejected := false;
  BEGIN
    UPDATE public.audit_logs
    SET reason = 'tampered'
    WHERE property_id = p AND action = 'integrity.test';
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: audit log update was accepted';
  END IF;

  -- 11. Platform Admin grants can be revoked but not rewritten or reactivated.
  INSERT INTO public.platform_admin_assignments (
    user_id, reason
  ) VALUES (u, 'Integrity test assignment')
  RETURNING id INTO admin_assignment;

  UPDATE public.platform_admin_assignments
  SET is_active = false, revoked_at = statement_timestamp()
  WHERE id = admin_assignment;

  rejected := false;
  BEGIN
    UPDATE public.platform_admin_assignments
    SET is_active = true, revoked_at = NULL
    WHERE id = admin_assignment;
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'TEST FAILED: revoked Platform Admin assignment was reactivated';
  END IF;

  -- 12. updated_at is maintained by the database on updates.
  SELECT updated_at INTO old_updated_at
  FROM public.rooms WHERE id = r;

  UPDATE public.rooms SET notes = 'Updated by integrity test' WHERE id = r;

  IF (SELECT updated_at FROM public.rooms WHERE id = r) <= old_updated_at THEN
    RAISE EXCEPTION 'TEST FAILED: rooms.updated_at did not advance';
  END IF;

  RAISE NOTICE 'PASS: reservation/allocation integrity, room/category bookability, lifecycle release, webhook validation, audit immutability, admin assignment history and updated_at triggers.';
END;
$$;

ROLLBACK;

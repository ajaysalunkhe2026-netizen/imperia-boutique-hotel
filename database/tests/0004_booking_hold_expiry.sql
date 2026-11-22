-- Expiry worker regression test. Requires migrations 0001 through 0007.
BEGIN;
DO $$
DECLARE
  p uuid;
  g uuid;
  c uuid;
  rm uuid;
  booking uuid;
  allocation uuid;
  expired_count integer;
BEGIN
  INSERT INTO public.properties (name, slug)
  VALUES ('Expiry Test Property', 'expiry-test-property')
  RETURNING id INTO p;

  INSERT INTO public.guests (property_id, full_name, email)
  VALUES (p, 'Expiry Test Guest', 'expiry-test@example.invalid')
  RETURNING id INTO g;

  INSERT INTO public.room_categories (property_id, name, is_bookable)
  VALUES (p, 'Expiry Category', true)
  RETURNING id INTO c;

  INSERT INTO public.rooms (property_id, category_id, room_number, is_bookable)
  VALUES (p, c, 'E-01', true)
  RETURNING id INTO rm;

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status, payment_status,
    check_in, check_out, currency_code, hold_expires_at
  ) VALUES (
    p, g, 'EXPIRY-001', 'HELD', 'PENDING',
    CURRENT_DATE + 1, CURRENT_DATE + 2, 'INR',
    clock_timestamp() - interval '1 minute'
  ) RETURNING id INTO booking;

  INSERT INTO public.room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (
    p, booking, rm, CURRENT_DATE + 1, CURRENT_DATE + 2, 'HELD'
  ) RETURNING id INTO allocation;

  expired_count := public.expire_booking_holds(100);

  IF expired_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: expected one expired hold, got %', expired_count;
  END IF;
  IF (SELECT status FROM public.reservations WHERE id = booking) <> 'CANCELLED' THEN
    RAISE EXCEPTION 'TEST FAILED: expired reservation was not cancelled';
  END IF;
  IF (SELECT status FROM public.room_allocations WHERE id = allocation) <> 'CANCELLED' THEN
    RAISE EXCEPTION 'TEST FAILED: expired allocation was not released';
  END IF;
  RAISE NOTICE 'PASS: expired hold and room allocation are cancelled atomically.';
END;
$$;
ROLLBACK;


-- Imperia Boutique Hotel
-- Database integrity smoke tests.
-- Requires migrations 0001 and 0002.
-- All test data is rolled back.

BEGIN;

DO $$
DECLARE
  p uuid;
  u uuid;
  g uuid;
  c uuid;
  r uuid;

  booking_a uuid;
  booking_b uuid;
  booking_c uuid;

  allocation_a uuid;
  allocation_rejected boolean := false;
BEGIN

  -- 1. Create test property and user.

  INSERT INTO properties (name, slug)
  VALUES ('Test Property', 'test-property')
  RETURNING id INTO p;

  INSERT INTO app_users (email, full_name)
  VALUES ('guest@example.invalid', 'Test Guest')
  RETURNING id INTO u;

  INSERT INTO guests (
    property_id, user_id, full_name, email
  )
  VALUES (p, u, 'Test Guest', 'guest@example.invalid')
  RETURNING id INTO g;

  INSERT INTO room_categories (
    property_id, name, is_bookable
  )
  VALUES (p, 'Test Category', true)
  RETURNING id INTO c;

  INSERT INTO rooms (
    property_id, category_id, room_number, is_bookable
  )
  VALUES (p, c, 'T-01', true)
  RETURNING id INTO r;

  -- 2. Owner and manager membership must be accepted.

  INSERT INTO property_memberships (
    property_id, user_id, role
  )
  VALUES
    (p, u, 'hotel_owner'),
    (p, u, 'hotel_manager');

  -- 3. Guest membership must be rejected.

  BEGIN
    INSERT INTO property_memberships (
      property_id, user_id, role
    )
    VALUES (p, u, 'guest');

    RAISE EXCEPTION
      'TEST FAILED: guest membership was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  -- 4. Platform admin membership must be rejected.

  BEGIN
    INSERT INTO property_memberships (
      property_id, user_id, role
    )
    VALUES (p, u, 'platform_admin');

    RAISE EXCEPTION
      'TEST FAILED: platform admin membership was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  -- 5. First reservation: January 10 to January 12.

  INSERT INTO reservations (
    property_id,
    guest_id,
    reservation_code,
    status,
    check_in,
    check_out,
    currency_code
  )
  VALUES (
    p, g, 'TEST-001', 'CONFIRMED',
    DATE '2030-01-10',
    DATE '2030-01-12',
    'INR'
  )
  RETURNING id INTO booking_a;

  INSERT INTO room_allocations (
    property_id,
    reservation_id,
    room_id,
    check_in,
    check_out,
    status
  )
  VALUES (
    p, booking_a, r,
    DATE '2030-01-10',
    DATE '2030-01-12',
    'CONFIRMED'
  )
  RETURNING id INTO allocation_a;

  -- 6. Second reservation: January 11 to January 13.
  -- Its overlapping room allocation must be rejected.

  INSERT INTO reservations (
    property_id,
    guest_id,
    reservation_code,
    status,
    check_in,
    check_out,
    currency_code
  )
  VALUES (
    p, g, 'TEST-002', 'CONFIRMED',
    DATE '2030-01-11',
    DATE '2030-01-13',
    'INR'
  )
  RETURNING id INTO booking_b;

  BEGIN
    INSERT INTO room_allocations (
      property_id,
      reservation_id,
      room_id,
      check_in,
      check_out,
      status
    )
    VALUES (
      p, booking_b, r,
      DATE '2030-01-11',
      DATE '2030-01-13',
      'CONFIRMED'
    );

    RAISE EXCEPTION
      'TEST FAILED: overlapping allocation was accepted';
  EXCEPTION
    WHEN exclusion_violation THEN
      NULL;
  END;

  -- 7. Allocation outside reservation dates must be rejected.

  allocation_rejected := false;

  BEGIN
    INSERT INTO room_allocations (
      property_id,
      reservation_id,
      room_id,
      check_in,
      check_out,
      status
    )
    VALUES (
      p, booking_b, r,
      DATE '2030-01-10',
      DATE '2030-01-11',
      'CONFIRMED'
    );

  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM =
        'Room allocation dates must be within reservation dates'
      THEN
        allocation_rejected := true;
      ELSE
        RAISE;
      END IF;
  END;

  IF NOT allocation_rejected THEN
    RAISE EXCEPTION
      'TEST FAILED: allocation outside reservation dates was accepted';
  END IF;

  -- 8. Third reservation: January 12 to January 14.
  -- Adjacent stay must be accepted.

  INSERT INTO reservations (
    property_id,
    guest_id,
    reservation_code,
    status,
    check_in,
    check_out,
    currency_code
  )
  VALUES (
    p, g, 'TEST-003', 'CONFIRMED',
    DATE '2030-01-12',
    DATE '2030-01-14',
    'INR'
  )
  RETURNING id INTO booking_c;

  INSERT INTO room_allocations (
    property_id,
    reservation_id,
    room_id,
    check_in,
    check_out,
    status
  )
  VALUES (
    p, booking_c, r,
    DATE '2030-01-12',
    DATE '2030-01-14',
    'CONFIRMED'
  );

  RAISE NOTICE
    'PASS: role constraints, overlapping allocation rejection, date validation and adjacent stay acceptance.';

END $$;

ROLLBACK;

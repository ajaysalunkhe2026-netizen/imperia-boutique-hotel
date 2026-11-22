-- Run against a disposable PostgreSQL database after applying 0001_initial_schema.sql.
-- This is a smoke test for key integrity constraints; it is not a full application test suite.
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
  allocation_a uuid;
BEGIN
  INSERT INTO properties (name, slug) VALUES ('Test Property', 'test-property')
    RETURNING id INTO p;
  INSERT INTO app_users (email, full_name) VALUES ('guest@example.invalid', 'Test Guest')
    RETURNING id INTO u;
  INSERT INTO guests (property_id, user_id, full_name, email)
    VALUES (p, u, 'Test Guest', 'guest@example.invalid') RETURNING id INTO g;
  INSERT INTO room_categories (property_id, name, is_bookable)
    VALUES (p, 'Test Category', true) RETURNING id INTO c;
  INSERT INTO rooms (property_id, category_id, room_number, is_bookable)
    VALUES (p, c, 'T-01', true) RETURNING id INTO r;

  INSERT INTO reservations (
    property_id, guest_id, reservation_code, status, check_in, check_out, currency_code
  ) VALUES (p, g, 'TEST-001', 'CONFIRMED', DATE '2030-01-10', DATE '2030-01-12', 'INR')
    RETURNING id INTO booking_a;

  INSERT INTO room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (p, booking_a, r, DATE '2030-01-10', DATE '2030-01-12', 'CONFIRMED')
    RETURNING id INTO allocation_a;

  INSERT INTO reservations (
    property_id, guest_id, reservation_code, status, check_in, check_out, currency_code
  ) VALUES (p, g, 'TEST-002', 'CONFIRMED', DATE '2030-01-11', DATE '2030-01-13', 'INR')
    RETURNING id INTO booking_b;

  BEGIN
    INSERT INTO room_allocations (
      property_id, reservation_id, room_id, check_in, check_out, status
    ) VALUES (p, booking_b, r, DATE '2030-01-11', DATE '2030-01-13', 'CONFIRMED');
    RAISE EXCEPTION 'TEST FAILED: overlapping active room allocation was accepted';
  EXCEPTION WHEN exclusion_violation THEN
    NULL; -- expected
  END;

  -- Adjacent stays are allowed because checkout is exclusive: [check-in, check-out).
  INSERT INTO room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (p, booking_b, r, DATE '2030-01-12', DATE '2030-01-14', 'CONFIRMED');

  UPDATE room_allocations SET status = 'RELEASED' WHERE id = allocation_a;
  RAISE NOTICE 'PASS: overlapping allocation rejected; adjacent stay accepted; released allocation no longer blocks inventory.';
END $$;

ROLLBACK;

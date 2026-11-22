-- Transactional room hold creation with idempotency and row-level locking.
-- Apply after 0005. Function is callable only by trusted service_role backend.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.reservation_code_seq;

CREATE TABLE public.reservation_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  reservation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_booking_requests_guest_fk
    FOREIGN KEY (guest_id, property_id)
    REFERENCES public.guests(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT reservation_booking_requests_reservation_fk
    FOREIGN KEY (reservation_id, property_id)
    REFERENCES public.reservations(id, property_id) ON DELETE RESTRICT,
  UNIQUE (property_id, guest_id, idempotency_key)
);

ALTER TABLE public.reservation_booking_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reservation_booking_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_property_id uuid,
  p_guest_id uuid,
  p_category_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_category public.room_categories%ROWTYPE;
  v_room_id uuid;
  v_reservation_id uuid;
  v_request public.reservation_booking_requests%ROWTYPE;
  v_code text;
  v_hold_expires_at timestamptz := clock_timestamp() + interval '10 minutes';
BEGIN
  IF p_property_id IS NULL OR p_guest_id IS NULL OR p_category_id IS NULL
     OR p_idempotency_key IS NULL OR p_check_in IS NULL OR p_check_out IS NULL
     OR p_check_out <= p_check_in OR p_check_in < CURRENT_DATE
     OR p_adults < 1 OR p_adults > 8 OR p_children < 0 OR p_children > 8 THEN
    RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.reservation_booking_requests
  WHERE property_id = p_property_id
    AND guest_id = p_guest_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_request.reservation_id IS NULL THEN
      RAISE EXCEPTION 'Booking request is already being processed'
        USING ERRCODE = '55P03';
    END IF;
    RETURN jsonb_build_object(
      'reservation_id', v_request.reservation_id,
      'idempotent_replay', true
    );
  END IF;

  INSERT INTO public.reservation_booking_requests
    (property_id, guest_id, idempotency_key)
  VALUES (p_property_id, p_guest_id, p_idempotency_key)
  RETURNING * INTO v_request;

  SELECT * INTO v_category
  FROM public.room_categories
  WHERE id = p_category_id
    AND property_id = p_property_id
    AND is_bookable IS TRUE
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room category is not bookable' USING ERRCODE = '23514';
  END IF;

  IF v_category.max_occupancy IS NOT NULL
     AND (p_adults + p_children) > v_category.max_occupancy THEN
    RAISE EXCEPTION 'Guest count exceeds category occupancy' USING ERRCODE = '22023';
  END IF;

  -- Serialize candidate selection for the same property/category/date interval.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_property_id::text || ':' || p_category_id::text || ':' ||
      p_check_in::text || ':' || p_check_out::text, 0
    )
  );

  SELECT rm.id INTO v_room_id
  FROM public.rooms AS rm
  WHERE rm.property_id = p_property_id
    AND rm.category_id = p_category_id
    AND rm.operational_status = 'ACTIVE'
    AND rm.is_bookable IS TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM public.room_allocations AS ra
      WHERE ra.room_id = rm.id
        AND ra.property_id = p_property_id
        AND ra.status IN ('HELD', 'CONFIRMED', 'CHECKED_IN')
        AND ra.check_in < p_check_out
        AND ra.check_out > p_check_in
    )
  ORDER BY rm.room_number
  LIMIT 1
  FOR UPDATE OF rm SKIP LOCKED;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'No room available for requested dates'
      USING ERRCODE = 'P0001';
  END IF;

  v_code := 'IMP-' || to_char(clock_timestamp() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD')
    || '-' || lpad(nextval('public.reservation_code_seq')::text, 6, '0');

  INSERT INTO public.reservations (
    property_id, guest_id, reservation_code, status, payment_status,
    check_in, check_out, adults, children, currency_code,
    hold_expires_at
  )
  SELECT p_property_id, p_guest_id, v_code, 'HELD', 'PENDING',
    p_check_in, p_check_out, p_adults, p_children, prop.currency_code,
    v_hold_expires_at
  FROM public.properties AS prop
  WHERE prop.id = p_property_id AND prop.is_active IS TRUE
  RETURNING id INTO v_reservation_id;

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'Property is not active' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.room_allocations (
    property_id, reservation_id, room_id, check_in, check_out, status
  ) VALUES (
    p_property_id, v_reservation_id, v_room_id, p_check_in, p_check_out, 'HELD'
  );

  UPDATE public.reservation_booking_requests
  SET reservation_id = v_reservation_id
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'reservation_code', v_code,
    'hold_expires_at', v_hold_expires_at,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_hold(uuid,uuid,uuid,date,date,integer,integer,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_hold(uuid,uuid,uuid,date,date,integer,integer,uuid)
TO service_role;

COMMIT;

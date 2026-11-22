-- Trusted expiry worker for temporary room holds.
-- Expired holds are cancelled; 0004's lifecycle trigger cancels their allocations.
BEGIN;

CREATE OR REPLACE FUNCTION public.expire_booking_holds(p_batch_size integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired_count integer := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 1000 THEN
    RAISE EXCEPTION 'Invalid expiry batch size' USING ERRCODE = '22023';
  END IF;

  WITH expired AS (
    SELECT r.id
    FROM public.reservations AS r
    WHERE r.status = 'HELD'
      AND r.hold_expires_at <= clock_timestamp()
    ORDER BY r.hold_expires_at, r.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  UPDATE public.reservations AS r
  SET status = 'CANCELLED',
      cancelled_at = clock_timestamp()
  FROM expired
  WHERE r.id = expired.id
    AND r.status = 'HELD'
  ;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_booking_holds(integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_booking_holds(integer)
TO service_role;

COMMIT;

-- Imperia Boutique Hotel
-- Phase 1: booking integrity, lifecycle consistency and audit protection.
-- Apply after migrations 0001, 0002 and 0003.
-- This migration does not create permissive RLS policies or expose data.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Consistent updated_at maintenance for mutable business tables.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'properties',
    'app_users',
    'guests',
    'room_categories',
    'rooms',
    'reservations',
    'room_allocations',
    'payments'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Allocation validity: reservation dates/state and room/category bookability.
-- Locks prevent concurrent changes to the referenced rows during validation.
-- The exclusion constraint in 0001 remains the final overlap guard.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_room_allocation_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  reservation_start date;
  reservation_end date;
  reservation_state public.reservation_status;
  room_state public.room_operational_status;
  room_bookable boolean;
  room_category_id uuid;
  category_bookable boolean;
  allocation_is_active boolean;
BEGIN
  SELECT r.check_in, r.check_out, r.status
    INTO reservation_start, reservation_end, reservation_state
  FROM public.reservations AS r
  WHERE r.id = NEW.reservation_id
    AND r.property_id = NEW.property_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found for allocation'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.check_in < reservation_start OR NEW.check_out > reservation_end THEN
    RAISE EXCEPTION 'Room allocation dates must be within reservation dates'
      USING ERRCODE = '23514';
  END IF;

  allocation_is_active := NEW.status IN ('HELD', 'CONFIRMED', 'CHECKED_IN');

  IF NOT allocation_is_active THEN
    RETURN NEW;
  END IF;

  IF reservation_state NOT IN ('HELD', 'CONFIRMED', 'CHECKED_IN') THEN
    RAISE EXCEPTION 'Active room allocation requires an active reservation'
      USING ERRCODE = '23514';
  END IF;

  SELECT rm.operational_status, rm.is_bookable, rm.category_id
    INTO room_state, room_bookable, room_category_id
  FROM public.rooms AS rm
  WHERE rm.id = NEW.room_id
    AND rm.property_id = NEW.property_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found for allocation'
      USING ERRCODE = '23503';
  END IF;

  IF room_state <> 'ACTIVE' OR room_bookable IS NOT TRUE THEN
    RAISE EXCEPTION 'Room is not available for allocation'
      USING ERRCODE = '23514';
  END IF;

  SELECT rc.is_bookable
    INTO category_bookable
  FROM public.room_categories AS rc
  WHERE rc.id = room_category_id
    AND rc.property_id = NEW.property_id
  FOR SHARE;

  IF NOT FOUND OR category_bookable IS NOT TRUE THEN
    RAISE EXCEPTION 'Room category is not bookable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_allocations_validate_dates ON public.room_allocations;

CREATE TRIGGER room_allocations_validate_integrity
BEFORE INSERT OR UPDATE OF
  reservation_id, property_id, room_id, check_in, check_out, status
ON public.room_allocations
FOR EACH ROW
EXECUTE FUNCTION public.validate_room_allocation_integrity();

-- ---------------------------------------------------------------------------
-- 3. Prevent reservation date edits from invalidating existing allocations.
-- Terminal reservation transitions release active allocations atomically.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_reservation_allocation_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.check_in IS DISTINCT FROM OLD.check_in
     OR NEW.check_out IS DISTINCT FROM OLD.check_out THEN
    IF EXISTS (
      SELECT 1
      FROM public.room_allocations AS ra
      WHERE ra.reservation_id = OLD.id
        AND ra.property_id = OLD.property_id
        AND ra.status IN ('HELD', 'CONFIRMED', 'CHECKED_IN')
        AND (
          ra.check_in < NEW.check_in
          OR ra.check_out > NEW.check_out
        )
    ) THEN
      RAISE EXCEPTION 'Reservation dates cannot exclude an active room allocation'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_guard_allocation_dates
BEFORE UPDATE OF check_in, check_out
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.guard_reservation_allocation_changes();

CREATE OR REPLACE FUNCTION public.release_allocations_for_terminal_reservation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('CANCELLED', 'NO_SHOW') THEN
      UPDATE public.room_allocations
      SET status = 'CANCELLED'
      WHERE reservation_id = NEW.id
        AND property_id = NEW.property_id
        AND status IN ('HELD', 'CONFIRMED');
    ELSIF NEW.status = 'CHECKED_OUT' THEN
      UPDATE public.room_allocations
      SET status = 'RELEASED'
      WHERE reservation_id = NEW.id
        AND property_id = NEW.property_id
        AND status IN ('HELD', 'CONFIRMED', 'CHECKED_IN');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_release_terminal_allocations
AFTER UPDATE OF status
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.release_allocations_for_terminal_reservation();

-- ---------------------------------------------------------------------------
-- 4. Do not make a room or category unavailable while active allocations exist.
-- Move/release allocations first; then change operational status/bookability.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_room_bookability_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (
    NEW.operational_status IS DISTINCT FROM OLD.operational_status
    OR NEW.is_bookable IS DISTINCT FROM OLD.is_bookable
  ) AND (
    NEW.operational_status <> 'ACTIVE'
    OR NEW.is_bookable IS NOT TRUE
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.room_allocations AS ra
      WHERE ra.room_id = OLD.id
        AND ra.property_id = OLD.property_id
        AND ra.status IN ('HELD', 'CONFIRMED', 'CHECKED_IN')
    ) THEN
      RAISE EXCEPTION 'Release or reassign active allocations before disabling a room'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rooms_guard_bookability
BEFORE UPDATE OF operational_status, is_bookable
ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.guard_room_bookability_change();

CREATE OR REPLACE FUNCTION public.guard_category_bookability_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.is_bookable IS TRUE AND NEW.is_bookable IS FALSE THEN
    IF EXISTS (
      SELECT 1
      FROM public.rooms AS rm
      JOIN public.room_allocations AS ra
        ON ra.room_id = rm.id
       AND ra.property_id = rm.property_id
      WHERE rm.category_id = OLD.id
        AND rm.property_id = OLD.property_id
        AND ra.status IN ('HELD', 'CONFIRMED', 'CHECKED_IN')
    ) THEN
      RAISE EXCEPTION 'Release or reassign active allocations before disabling a room category'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER room_categories_guard_bookability
BEFORE UPDATE OF is_bookable
ON public.room_categories
FOR EACH ROW
EXECUTE FUNCTION public.guard_category_bookability_change();

-- ---------------------------------------------------------------------------
-- 5. Webhook integrity: event provider must match payment provider; processing
-- requires verified signature. Unique(provider, provider_event_id) is idempotency.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_payment_webhook_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment_provider text;
BEGIN
  SELECT p.provider
    INTO payment_provider
  FROM public.payments AS p
  WHERE p.id = NEW.payment_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found for webhook event'
      USING ERRCODE = '23503';
  END IF;

  IF payment_provider <> NEW.provider THEN
    RAISE EXCEPTION 'Webhook provider does not match payment provider'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.processed_at IS NOT NULL AND NEW.signature_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Webhook cannot be processed before signature verification'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_webhook_events_validate
BEFORE INSERT OR UPDATE OF payment_id, provider, signature_verified, processed_at
ON public.payment_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_webhook_event();

-- ---------------------------------------------------------------------------
-- 6. Audit events are append-only through ordinary table operations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records are immutable'
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER audit_logs_reject_update
BEFORE UPDATE OR DELETE
ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.reject_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- 7. Platform Admin assignment history is append-only; active assignments may
-- only be revoked, never edited or reactivated.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_platform_admin_assignment_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Platform administrator assignment history cannot be deleted'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.is_active IS FALSE THEN
    RAISE EXCEPTION 'Revoked platform administrator assignments are immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.granted_by_user_id IS DISTINCT FROM OLD.granted_by_user_id
     OR NEW.granted_at IS DISTINCT FROM OLD.granted_at
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.is_active IS NOT FALSE
     OR NEW.revoked_at IS NULL THEN
    RAISE EXCEPTION 'Platform administrator assignments may only be revoked'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER platform_admin_assignments_guard_history
BEFORE UPDATE OR DELETE
ON public.platform_admin_assignments
FOR EACH ROW
EXECUTE FUNCTION public.guard_platform_admin_assignment_history();

COMMIT;

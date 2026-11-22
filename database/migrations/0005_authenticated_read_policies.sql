-- Imperia Boutique Hotel
-- Phase 1: authenticated read isolation.
-- Direct client writes remain disabled. Mutations must go through trusted,
-- server-authorized workflows until separate write policies are reviewed.

BEGIN;

-- Authorization helpers stay outside PostgREST's default exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id
  FROM public.app_users AS au
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active IS TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.has_property_role(target_property_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_memberships AS pm
    JOIN public.app_users AS au ON au.id = pm.user_id
    WHERE pm.property_id = target_property_id
      AND pm.user_id = private.current_app_user_id()
      AND pm.is_active IS TRUE
      AND au.is_active IS TRUE
      AND pm.role::text = ANY (allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_guest_profile(target_guest_id uuid, target_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guests AS g
    WHERE g.id = target_guest_id
      AND g.property_id = target_property_id
      AND g.user_id = private.current_app_user_id()
  );
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_property_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.owns_guest_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_property_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_guest_profile(uuid, uuid) TO authenticated;

REVOKE ALL ON TABLE
  public.properties,
  public.app_users,
  public.property_memberships,
  public.guests,
  public.room_categories,
  public.rooms,
  public.reservations,
  public.room_allocations,
  public.payments,
  public.payment_webhook_events,
  public.audit_logs,
  public.platform_admin_assignments
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.properties,
  public.app_users,
  public.property_memberships,
  public.guests,
  public.room_categories,
  public.rooms,
  public.reservations,
  public.room_allocations,
  public.payments,
  public.audit_logs
TO authenticated;

CREATE POLICY app_users_select_self
ON public.app_users FOR SELECT TO authenticated
USING (id = private.current_app_user_id());

CREATE POLICY property_memberships_select_self
ON public.property_memberships FOR SELECT TO authenticated
USING (user_id = private.current_app_user_id());

CREATE POLICY properties_select_hotel_staff
ON public.properties FOR SELECT TO authenticated
USING (private.has_property_role(id, ARRAY['hotel_owner','hotel_manager']));

CREATE POLICY room_categories_select_hotel_staff
ON public.room_categories FOR SELECT TO authenticated
USING (private.has_property_role(property_id, ARRAY['hotel_owner','hotel_manager']));

CREATE POLICY rooms_select_hotel_staff
ON public.rooms FOR SELECT TO authenticated
USING (private.has_property_role(property_id, ARRAY['hotel_owner','hotel_manager']));

CREATE POLICY guests_select_owner_or_hotel_staff
ON public.guests FOR SELECT TO authenticated
USING (
  user_id = private.current_app_user_id()
  OR private.has_property_role(property_id, ARRAY['hotel_owner','hotel_manager'])
);

CREATE POLICY reservations_select_owner_manager_or_guest
ON public.reservations FOR SELECT TO authenticated
USING (
  private.has_property_role(property_id, ARRAY['hotel_owner','hotel_manager'])
  OR private.owns_guest_profile(guest_id, property_id)
);

CREATE POLICY room_allocations_select_owner_manager_or_guest
ON public.room_allocations FOR SELECT TO authenticated
USING (
  private.has_property_role(property_id, ARRAY['hotel_owner','hotel_manager'])
  OR EXISTS (
    SELECT 1
    FROM public.reservations AS r
    WHERE r.id = room_allocations.reservation_id
      AND r.property_id = room_allocations.property_id
      AND private.owns_guest_profile(r.guest_id, r.property_id)
  )
);

CREATE POLICY payments_select_owner_or_guest
ON public.payments FOR SELECT TO authenticated
USING (
  private.has_property_role(property_id, ARRAY['hotel_owner'])
  OR EXISTS (
    SELECT 1
    FROM public.reservations AS r
    WHERE r.id = payments.reservation_id
      AND r.property_id = payments.property_id
      AND private.owns_guest_profile(r.guest_id, r.property_id)
  )
);

CREATE POLICY audit_logs_select_hotel_owner
ON public.audit_logs FOR SELECT TO authenticated
USING (
  property_id IS NOT NULL
  AND private.has_property_role(property_id, ARRAY['hotel_owner'])
);

-- No client access to webhook events or Platform Admin assignment history.
-- No INSERT/UPDATE/DELETE policies are created in this phase.
COMMIT;

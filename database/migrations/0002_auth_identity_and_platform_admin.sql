
-- Imperia Boutique Hotel
-- Supabase Auth identity mapping and global platform administration.
-- Apply after 0001_initial_schema.sql.
-- No users or platform administrators are seeded.

BEGIN;

-- =====================================================
-- SUPABASE AUTH IDENTITY MAPPING
-- One Supabase Auth account maps to one application user.
-- =====================================================

ALTER TABLE app_users
  ADD COLUMN auth_user_id uuid;

ALTER TABLE app_users
  ADD CONSTRAINT app_users_auth_user_id_fk
  FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX app_users_auth_user_id_unique
  ON app_users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- =====================================================
-- GLOBAL PLATFORM ADMIN ASSIGNMENTS
-- Platform administrators are not hotel memberships.
-- =====================================================

CREATE TABLE platform_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES app_users(id) ON DELETE RESTRICT,

  is_active boolean NOT NULL DEFAULT true,

  granted_by_user_id uuid
    REFERENCES app_users(id) ON DELETE RESTRICT,

  granted_at timestamptz NOT NULL DEFAULT now(),

  revoked_at timestamptz,

  reason text NOT NULL,

  CONSTRAINT platform_admin_reason_nonempty
    CHECK (length(trim(reason)) > 0),

  CONSTRAINT platform_admin_revocation_consistent
    CHECK (
      (is_active = true AND revoked_at IS NULL)
      OR
      (is_active = false AND revoked_at IS NOT NULL)
    ),

  CONSTRAINT platform_admin_not_self_granted
    CHECK (
      granted_by_user_id IS NULL
      OR granted_by_user_id <> user_id
    )
);

-- Only one active global admin assignment per application user.
CREATE UNIQUE INDEX platform_admin_one_active_assignment_per_user
  ON platform_admin_assignments (user_id)
  WHERE is_active = true;

CREATE INDEX platform_admin_assignments_active_idx
  ON platform_admin_assignments (is_active, granted_at DESC);

CREATE INDEX platform_admin_assignments_grantor_idx
  ON platform_admin_assignments (granted_by_user_id);

COMMIT;

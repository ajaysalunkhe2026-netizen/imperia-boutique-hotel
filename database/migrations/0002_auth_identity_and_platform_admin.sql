-- Identity-provider mapping and global platform administration.
-- Apply only after 0001 on a dedicated development/staging database.
-- No identities or platform administrators are seeded.

BEGIN;

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (provider, provider_subject),
  UNIQUE (app_user_id, provider),
  CONSTRAINT auth_identities_provider_nonempty CHECK (length(trim(provider)) > 0),
  CONSTRAINT auth_identities_subject_nonempty CHECK (length(trim(provider_subject)) > 0)
);

CREATE INDEX auth_identities_user_idx ON auth_identities (app_user_id);

CREATE TABLE platform_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  granted_by_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  reason text NOT NULL,
  CONSTRAINT platform_admin_reason_nonempty CHECK (length(trim(reason)) > 0),
  CONSTRAINT platform_admin_revocation_consistent CHECK (
    (is_active = true AND revoked_at IS NULL) OR
    (is_active = false AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX platform_admin_one_active_assignment_per_user
  ON platform_admin_assignments (user_id)
  WHERE is_active = true;

COMMIT;

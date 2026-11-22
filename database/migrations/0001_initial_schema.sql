-- Imperia Boutique Hotel: provider-neutral PostgreSQL foundation
-- Apply only to a new, dedicated development/staging database after review.
-- No hotel inventory, rates, staff identities, or credentials are seeded here.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE app_role AS ENUM ('platform_admin', 'hotel_owner', 'hotel_manager', 'guest');
CREATE TYPE reservation_status AS ENUM (
  'DRAFT', 'PENDING', 'HELD', 'CONFIRMED', 'CHECKED_IN',
  'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'
);
CREATE TYPE payment_status AS ENUM (
  'NOT_REQUIRED', 'PENDING', 'AUTHORIZED', 'PAID', 'FAILED',
  'PARTIALLY_REFUNDED', 'REFUNDED'
);
CREATE TYPE room_operational_status AS ENUM ('ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE');
CREATE TYPE allocation_status AS ENUM ('HELD', 'CONFIRMED', 'CHECKED_IN', 'RELEASED', 'CANCELLED');

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code char(3) NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT properties_name_nonempty CHECK (length(trim(name)) > 0),
  CONSTRAINT properties_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_email_nonempty CHECK (length(trim(email)) > 0)
);

CREATE TABLE property_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  role app_role NOT NULL CHECK (role <> 'guest'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, user_id, role),
  UNIQUE (id, property_id)
);

CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  CONSTRAINT guests_name_nonempty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT guests_contact_present CHECK (
    (email IS NOT NULL AND length(trim(email)) > 0) OR
    (phone IS NOT NULL AND length(trim(phone)) > 0)
  )
);

CREATE TABLE room_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  max_occupancy integer,
  is_bookable boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  UNIQUE (property_id, name),
  CONSTRAINT room_categories_name_nonempty CHECK (length(trim(name)) > 0),
  CONSTRAINT room_categories_occupancy_positive CHECK (max_occupancy IS NULL OR max_occupancy > 0)
);

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL,
  room_number text NOT NULL,
  operational_status room_operational_status NOT NULL DEFAULT 'ACTIVE',
  is_bookable boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  UNIQUE (property_id, room_number),
  FOREIGN KEY (category_id, property_id)
    REFERENCES room_categories(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT rooms_number_nonempty CHECK (length(trim(room_number)) > 0)
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL,
  reservation_code text NOT NULL,
  status reservation_status NOT NULL DEFAULT 'PENDING',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  currency_code char(3) NOT NULL,
  quoted_total_minor bigint,
  special_requests text,
  hold_expires_at timestamptz,
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  UNIQUE (property_id, reservation_code),
  FOREIGN KEY (guest_id, property_id)
    REFERENCES guests(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT reservations_date_range CHECK (check_out > check_in),
  CONSTRAINT reservations_guest_counts CHECK (adults > 0 AND children >= 0),
  CONSTRAINT reservations_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT reservations_total_nonnegative CHECK (quoted_total_minor IS NULL OR quoted_total_minor >= 0),
  CONSTRAINT reservations_hold_expiry CHECK (status <> 'HELD' OR hold_expires_at IS NOT NULL)
);

CREATE INDEX reservations_property_dates_idx
  ON reservations (property_id, check_in, check_out);
CREATE INDEX reservations_guest_created_idx
  ON reservations (guest_id, created_at DESC);

CREATE TABLE room_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  room_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  status allocation_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (reservation_id, property_id)
    REFERENCES reservations(id, property_id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id, property_id)
    REFERENCES rooms(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT room_allocations_date_range CHECK (check_out > check_in),
  CONSTRAINT room_allocations_no_active_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      daterange(check_in, check_out, '[)') WITH &&
    )
    WHERE (status IN ('HELD', 'CONFIRMED', 'CHECKED_IN'))
);

CREATE INDEX room_allocations_reservation_idx ON room_allocations (reservation_id);
CREATE INDEX room_allocations_property_dates_idx ON room_allocations (property_id, check_in, check_out);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  provider text NOT NULL,
  provider_payment_id text,
  status payment_status NOT NULL DEFAULT 'PENDING',
  amount_minor bigint NOT NULL,
  currency_code char(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (reservation_id, property_id)
    REFERENCES reservations(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT payments_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT payments_provider_nonempty CHECK (length(trim(provider)) > 0),
  CONSTRAINT payments_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  signature_verified boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id),
  CONSTRAINT payment_webhook_event_id_nonempty CHECK (length(trim(provider_event_id)) > 0)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILURE')),
  reason text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_action_nonempty CHECK (length(trim(action)) > 0),
  CONSTRAINT audit_target_nonempty CHECK (length(trim(target_type)) > 0)
);

CREATE INDEX audit_logs_property_time_idx ON audit_logs (property_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_time_idx ON audit_logs (actor_user_id, occurred_at DESC);

COMMIT;

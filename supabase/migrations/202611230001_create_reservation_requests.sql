-- Reservation enquiries are requests, not confirmed bookings.
-- No public read/update/delete access is granted; hotel staff access must be
-- configured separately through authenticated admin policies.
create table if not exists public.reservation_requests (
  id bigint generated always as identity primary key,
  reference text not null unique,
  check_in date not null,
  check_out date not null,
  adults smallint not null check (adults between 1 and 6),
  children smallint not null default 0 check (children between 0 and 4),
  rooms smallint not null check (rooms between 1 and 4),
  room_type text not null check (room_type in ('Any available room', 'Amber Stone', 'Opal Suite')),
  guest_name text not null check (char_length(guest_name) between 2 and 100),
  guest_phone text not null,
  guest_email text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint reservation_dates_valid check (check_out > check_in and check_out <= check_in + 30)
);

create index if not exists reservation_requests_created_at_idx
  on public.reservation_requests (created_at desc);
create index if not exists reservation_requests_status_idx
  on public.reservation_requests (status, created_at desc);

alter table public.reservation_requests enable row level security;

-- Anonymous visitors may submit a request, but cannot read or alter any request.
revoke all on table public.reservation_requests from anon, authenticated;
grant insert on table public.reservation_requests to anon, authenticated;

drop policy if exists "Public can submit reservation requests" on public.reservation_requests;
create policy "Public can submit reservation requests"
  on public.reservation_requests
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and check_out > check_in
    and check_out <= check_in + 30
  );

grant usage, select on sequence public.reservation_requests_id_seq to anon, authenticated;

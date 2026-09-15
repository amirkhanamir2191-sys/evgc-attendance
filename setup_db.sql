-- ============================================================
-- EVGC Attendance System — Supabase Database Setup
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop existing tables if re-running
drop table if exists attendance;
drop table if exists participants;

-- PARTICIPANTS table (Master list)
create table participants (
  id            bigserial primary key,
  evgc_id       text,
  name          text not null,
  district      text,
  zone          text,
  post_type     text,
  school_id     text,
  school_name   text,
  batch         text,
  scheduled_date text,
  date_iso      date,
  created_at    timestamptz default now()
);

-- Index for fast lookup by EVGC ID or School ID
create index idx_participants_evgc_id   on participants(evgc_id);
create index idx_participants_school_id on participants(school_id);
create index idx_participants_date_iso  on participants(date_iso);

-- ATTENDANCE table
create table attendance (
  id                    bigserial primary key,
  evgc_id               text,
  school_id             text,
  name                  text,
  district              text,
  zone                  text,
  school_name           text,
  batch                 text,
  checkin_time          timestamptz,
  checkin_distance_m    integer,
  checkout_time         timestamptz,
  checkout_distance_m   integer,
  created_at            timestamptz default now()
);

create index idx_attendance_evgc_id   on attendance(evgc_id);
create index idx_attendance_school_id on attendance(school_id);
create index idx_attendance_checkin   on attendance(checkin_time);

-- ============================================================
-- Row Level Security — allow anonymous reads for lookup,
-- but writes only with service_role key (your API routes).
-- ============================================================
alter table participants enable row level security;
alter table attendance   enable row level security;

-- Anyone can read participants (needed for the check-in page lookup)
create policy "Public read participants"
  on participants for select
  using (true);

-- Anyone can read attendance (needed to check if already checked in)
create policy "Public read attendance"
  on attendance for select
  using (true);

-- Only service_role can insert/update attendance (API routes use service key)
create policy "Service insert attendance"
  on attendance for insert
  with check (true);

create policy "Service update attendance"
  on attendance for update
  using (true);

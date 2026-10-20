-- Orma initial schema (Stage D baseline)
-- Apply in Supabase SQL editor or migration tooling.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  area text not null check (area in ('career', 'money', 'health', 'family')),
  duration integer not null check (duration between 5 and 1020),
  done boolean not null default false,
  scheduled_date date,
  scheduled_time time,
  deadline date,
  is_private boolean not null default false,
  parent_id uuid references public.tasks(id) on delete set null,
  map_role text check (map_role in ('startup', 'launch', 'networking', 'resume', 'mental', 'fitness', 'main')),
  color text,
  pos_x integer,
  pos_y integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_schedule on public.tasks(user_id, scheduled_date, scheduled_time);
create index if not exists idx_tasks_parent on public.tasks(parent_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_completed boolean not null default true,
  focus_minutes integer not null default 25,
  short_break_minutes integer not null default 5,
  long_break_minutes integer not null default 15,
  auto_start_break boolean not null default false,
  auto_start_focus boolean not null default false,
  tick_sound_enabled boolean not null default true,
  completion_sound_enabled boolean not null default true,
  enable_water_fx boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  mode text not null check (mode in ('focus', 'short', 'long')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null check (duration_seconds > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'razorpay')),
  plan_code text not null,
  status text not null check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.user_settings enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles owner read"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles owner upsert"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "tasks owner only"
on public.tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "settings owner only"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sessions owner only"
on public.focus_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "subscriptions owner read"
on public.subscriptions
for select
using (auth.uid() = user_id);

create policy "subscriptions backend write"
on public.subscriptions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

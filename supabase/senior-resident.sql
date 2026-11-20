-- Senior Resident. Run once in the Supabase SQL editor.

-- Daily counters (shared with the coach function). Safe to re-run.
create table if not exists public.usage (
  key text not null,
  day date not null default current_date,
  n int not null default 0,
  primary key (key, day)
);
alter table public.usage enable row level security;
create or replace function public.bump_usage(k text) returns int
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.usage(key, day, n) values (k, current_date, 1)
  on conflict (key, day) do update set n = public.usage.n + 1
  returning n into c;
  return c;
end $$;
revoke all on function public.bump_usage(text) from public, anon, authenticated;
grant execute on function public.bump_usage(text) to service_role;

-- Plans. Only the Stripe webhook (service role) writes here. People can read their own row.
create table if not exists public.sr_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  stripe_customer text,
  stripe_sub text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists sr_profiles_customer on public.sr_profiles (stripe_customer);
alter table public.sr_profiles enable row level security;
drop policy if exists "sr own plan read" on public.sr_profiles;
create policy "sr own plan read" on public.sr_profiles for select to authenticated using (user_id = auth.uid());

-- People who asked to hear when Pro opens.
create table if not exists public.sr_waitlist (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  period text not null default '',
  ts timestamptz not null default now()
);
alter table public.sr_waitlist enable row level security;
drop policy if exists "sr waitlist insert" on public.sr_waitlist;
create policy "sr waitlist insert" on public.sr_waitlist for insert to authenticated with check (user_id = auth.uid());

-- To give someone Pro by hand (yourself, a classmate):
-- insert into public.sr_profiles (user_id, plan) select id, 'pro' from auth.users where email = 'someone@example.com'
--   on conflict (user_id) do update set plan = 'pro', current_period_end = null;

-- Feedback, error reports and help escalations. Anyone can send one; only you (dashboard / service role) can read them.
create table if not exists public.sr_feedback (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  kind text not null check (kind in ('idea','problem','other','error','escalation')),
  body text not null default '' check (char_length(body) <= 8000),
  email text not null default '' check (char_length(email) <= 200),
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'open'
);
alter table public.sr_feedback enable row level security;
drop policy if exists "sr feedback insert" on public.sr_feedback;
create policy "sr feedback insert" on public.sr_feedback for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

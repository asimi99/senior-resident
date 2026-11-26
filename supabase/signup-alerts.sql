-- Phone alert (ntfy) for every new account, whichever way it signs up (email, Google, Apple, iPhone app).
-- Run once in the Supabase SQL editor. Subscribe to the topic in the ntfy app to get the alerts.
create extension if not exists pg_net with schema extensions;

create or replace function public.sr_notify_signup() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  em text := coalesce(new.email, '');
  masked text := case when position('@' in em) > 1
    then left(split_part(em, '@', 1), 2) || '•••@' || split_part(em, '@', 2) else '(no email)' end;
begin
  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic', 'msr-1ea63d48e6dfab0969d5',
      'title', 'New sign-up',
      'message', masked || ' with ' || coalesce(new.raw_app_meta_data->>'provider', 'email'),
      'tags', jsonb_build_array('tada'),
      'priority', 4,
      'click', 'https://supabase.com/dashboard/project/ldvuigiqzloupwpfucfh/auth/users'),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
exception when others then
  return new;   -- an alert problem must never block a sign-up
end $$;

drop trigger if exists sr_notify_signup on auth.users;
create trigger sr_notify_signup after insert on auth.users
  for each row execute function public.sr_notify_signup();

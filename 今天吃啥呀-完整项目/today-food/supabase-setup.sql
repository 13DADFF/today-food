-- Run once in Supabase Dashboard > SQL Editor.
-- Email OTP must be enabled in Authentication > Providers > Email.
create table if not exists public.food_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);
alter table public.food_sync enable row level security;
revoke all on public.food_sync from anon;
grant select, insert, update on public.food_sync to authenticated;
drop policy if exists "Users read own food data" on public.food_sync;
create policy "Users read own food data" on public.food_sync for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own food data" on public.food_sync;
create policy "Users insert own food data" on public.food_sync for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own food data" on public.food_sync;
create policy "Users update own food data" on public.food_sync for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

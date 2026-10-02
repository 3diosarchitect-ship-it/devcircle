-- QA polish: tighten notification insert policy + grant authenticated join helpers
-- Safe to re-run

drop policy if exists "notifications_insert_auth" on public.notifications;
create policy "notifications_insert_auth" on public.notifications
  for insert
  with check (auth.uid() is not null);

-- Allow authenticated users to insert notifications for themselves
-- (community join messages, teammate confirmations)
drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert
  with check (profile_id = auth.uid());

-- Ensure public can read completed/demo profiles (public /u/[username])
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (
  onboarding_complete = true
  or id = auth.uid()
  or is_demo = true
);

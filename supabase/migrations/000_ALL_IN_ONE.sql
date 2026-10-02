-- DevCircle ALL-IN-ONE migration — paste into Supabase SQL Editor and Run once
-- Project: https://gwwhmromeuzzprmvaito.supabase.co

-- DevCircle MVP Schema
-- Run this in Supabase SQL Editor (or via supabase db push)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role as enum ('student', 'admin', 'company'); -- FUTURE: company/recruiter accounts
exception when duplicate_object then null; end $$;

do $$ begin
  create type opportunity_type as enum ('internship', 'freelance', 'full_time', 'project');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_mode as enum ('remote', 'onsite', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_type as enum ('question', 'project', 'looking_for_teammate', 'achievement', 'opportunity');
exception when duplicate_object then null; end $$;

do $$ begin
  create type looking_for_type as enum ('internship', 'freelance', 'full_time', 'open_source', 'team_projects');
exception when duplicate_object then null; end $$;

-- Skills
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category text,
  created_at timestamptz not null default now()
);

-- Communities (dynamically created from skills)
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  skill_id uuid references public.skills(id) on delete set null,
  avatar_url text,
  member_count int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  college text,
  course text,
  graduation_year int,
  city text,
  bio text,
  headline text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  role user_role not null default 'student',
  -- FUTURE: company_id uuid references companies(id)
  looking_for looking_for_type[] default '{}',
  onboarding_complete boolean not null default false,
  is_demo boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (profile_id, skill_id)
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  type post_type not null default 'question',
  content text not null,
  link_url text,
  like_count int not null default 0,
  comment_count int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  tech_stack text[] default '{}',
  github_url text,
  live_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  type opportunity_type not null,
  location text,
  work_mode work_mode not null default 'remote',
  skills text[] default '{}',
  stipend text,
  description text,
  apply_url text,
  source text default 'Demo',
  experience_level text default 'internship', -- internship | junior | mid
  is_demo boolean not null default true,
  -- FUTURE: company_id uuid references companies(id)
  created_at timestamptz not null default now()
);

create table if not exists public.saved_opportunities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, opportunity_id)
);

create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  looking_for_skills text[] default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_city on public.profiles(city);
create index if not exists idx_communities_slug on public.communities(slug);
create index if not exists idx_posts_community on public.posts(community_id, created_at desc);
create index if not exists idx_opportunities_type on public.opportunities(type);
create index if not exists idx_notifications_profile on public.notifications(profile_id, read, created_at desc);
create index if not exists idx_profile_skills_skill on public.profile_skills(skill_id);
create index if not exists idx_community_members_profile on public.community_members(profile_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'))
      || '_' || substr(replace(new.id::text, '-', ''), 1, 6)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep community member_count in sync
create or replace function public.update_community_member_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists community_members_count on public.community_members;
create trigger community_members_count
  after insert or delete on public.community_members
  for each row execute function public.update_community_member_count();

-- Keep post like/comment counts
create or replace function public.update_post_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.update_post_like_count();

create or replace function public.update_post_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists comments_count on public.comments;
create trigger comments_count
  after insert or delete on public.comments
  for each row execute function public.update_post_comment_count();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.skills enable row level security;
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.projects enable row level security;
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.team_requests enable row level security;
alter table public.notifications enable row level security;

-- Skills: public read
drop policy if exists "skills_read" on public.skills;
create policy "skills_read" on public.skills for select using (true);
drop policy if exists "skills_admin_write" on public.skills;
create policy "skills_admin_write" on public.skills for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- Communities: public read, authenticated join via members table
drop policy if exists "communities_read" on public.communities;
create policy "communities_read" on public.communities for select using (true);
drop policy if exists "communities_admin_write" on public.communities;
create policy "communities_admin_write" on public.communities for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- Profiles: public read of completed profiles, own write
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (
  onboarding_complete = true or id = auth.uid() or is_demo = true
);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- Profile skills
drop policy if exists "profile_skills_read" on public.profile_skills;
create policy "profile_skills_read" on public.profile_skills for select using (true);
drop policy if exists "profile_skills_own" on public.profile_skills;
create policy "profile_skills_own" on public.profile_skills for all using (profile_id = auth.uid());

-- Community members
drop policy if exists "community_members_read" on public.community_members;
create policy "community_members_read" on public.community_members for select using (true);
drop policy if exists "community_members_own" on public.community_members;
create policy "community_members_own" on public.community_members for insert with check (profile_id = auth.uid());
drop policy if exists "community_members_delete_own" on public.community_members;
create policy "community_members_delete_own" on public.community_members for delete using (profile_id = auth.uid());

-- Posts
drop policy if exists "posts_read" on public.posts;
create policy "posts_read" on public.posts for select using (true);
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert with check (author_id = auth.uid());
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts for update using (author_id = auth.uid());
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete using (
  author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
);

-- Post likes
drop policy if exists "post_likes_read" on public.post_likes;
create policy "post_likes_read" on public.post_likes for select using (true);
drop policy if exists "post_likes_own" on public.post_likes;
create policy "post_likes_own" on public.post_likes for all using (profile_id = auth.uid());

-- Comments
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select using (true);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (author_id = auth.uid());
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete using (author_id = auth.uid());

-- Projects
drop policy if exists "projects_read" on public.projects;
create policy "projects_read" on public.projects for select using (true);
drop policy if exists "projects_own" on public.projects;
create policy "projects_own" on public.projects for all using (profile_id = auth.uid());

-- Opportunities: public read
drop policy if exists "opportunities_read" on public.opportunities;
create policy "opportunities_read" on public.opportunities for select using (true);
drop policy if exists "opportunities_admin" on public.opportunities;
create policy "opportunities_admin" on public.opportunities for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
-- FUTURE: company write policy for their own opportunities

-- Saved opportunities
drop policy if exists "saved_read_own" on public.saved_opportunities;
create policy "saved_read_own" on public.saved_opportunities for select using (profile_id = auth.uid());
drop policy if exists "saved_own" on public.saved_opportunities;
create policy "saved_own" on public.saved_opportunities for all using (profile_id = auth.uid());

-- Team requests
drop policy if exists "team_requests_read" on public.team_requests;
create policy "team_requests_read" on public.team_requests for select using (true);
drop policy if exists "team_requests_insert" on public.team_requests;
create policy "team_requests_insert" on public.team_requests for insert with check (author_id = auth.uid());
drop policy if exists "team_requests_own" on public.team_requests;
create policy "team_requests_own" on public.team_requests for update using (author_id = auth.uid());
drop policy if exists "team_requests_delete_own" on public.team_requests;
create policy "team_requests_delete_own" on public.team_requests for delete using (author_id = auth.uid());

-- Notifications
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for select using (profile_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (profile_id = auth.uid());
drop policy if exists "notifications_insert_auth" on public.notifications;
create policy "notifications_insert_auth" on public.notifications for insert with check (true);

-- ========== 002_qa_rls_polish ==========

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

-- ========== 003_seed_skills ==========

-- Seed skills so new signups can onboarding without admin skill inserts failing mid-flow.
-- Prefer running npm run seed after schema; this is a lightweight skill bootstrap.

insert into public.skills (name, slug, category)
values
  ('Swift', 'swift', 'mobile'),
  ('SwiftUI', 'swiftui', 'mobile'),
  ('iOS', 'ios', 'mobile'),
  ('Android', 'android', 'mobile'),
  ('Flutter', 'flutter', 'mobile'),
  ('React', 'react', 'web'),
  ('React Native', 'react-native', 'mobile'),
  ('Node.js', 'node-js', 'backend'),
  ('MERN', 'mern', 'web'),
  ('Python', 'python', 'backend'),
  ('Django', 'django', 'backend'),
  ('AI / ML', 'ai-ml', 'ai'),
  ('Data Science', 'data-science', 'ai'),
  ('Java', 'java', 'backend'),
  ('Spring Boot', 'spring-boot', 'backend'),
  ('UI/UX', 'ui-ux', 'design'),
  ('DevOps', 'devops', 'infra'),
  ('Cloud', 'cloud', 'infra'),
  ('Cybersecurity', 'cybersecurity', 'security'),
  ('MongoDB', 'mongodb', 'backend'),
  ('JavaScript', 'javascript', 'web'),
  ('TypeScript', 'typescript', 'web'),
  ('ARKit', 'arkit', 'mobile')
on conflict (slug) do nothing;

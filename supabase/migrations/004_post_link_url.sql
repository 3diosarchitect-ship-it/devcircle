-- Optional external job / resource link on community posts (e.g. LinkedIn job URL)
alter table public.posts
  add column if not exists link_url text;

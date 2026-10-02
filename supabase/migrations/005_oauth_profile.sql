-- Enrich profiles created via Google / GitHub OAuth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  meta_name text;
  meta_avatar text;
  meta_github text;
begin
  meta_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  meta_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
  meta_github := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username'
  );
  base_username := lower(regexp_replace(
    coalesce(meta_github, new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if base_username is null or length(base_username) < 2 then
    base_username := 'dev';
  end if;

  insert into public.profiles (
    id,
    full_name,
    username,
    avatar_url,
    github_url
  )
  values (
    new.id,
    meta_name,
    base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    meta_avatar,
    case
      when meta_github is not null and length(meta_github) > 0
        then 'https://github.com/' || meta_github
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;

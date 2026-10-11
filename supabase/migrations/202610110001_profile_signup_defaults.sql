-- Signup defaults only. Existing accounts, expiry, billing and RLS are unchanged.
begin;

create temporary table profile_defaults_snapshot on commit drop as
select md5(coalesce(string_agg(to_jsonb(p)::text, '' order by id), '')) as digest
from public.profiles p;

alter table public.profiles alter column max_charts set default 20;
alter table public.profiles alter column max_edits_per_chart set default 3;
alter table public.profiles alter column can_use_divination set default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (
    id, email, role, max_charts, max_edits_per_chart,
    is_banned, can_use_divination, access_expiry
  ) values (
    new.id, new.email, 'general', 20, 3,
    false, false, (now() + interval '1 month')
  );
  return new;
end;
$function$;

do $verify$
begin
  if (select digest from profile_defaults_snapshot) is distinct from
     (select md5(coalesce(string_agg(to_jsonb(p)::text, '' order by id), '')) from public.profiles p)
  then
    raise exception 'Existing profiles changed; rolling back defaults migration';
  end if;
end;
$verify$;

commit;

select column_name, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('max_charts', 'max_edits_per_chart', 'can_use_divination')
order by column_name;

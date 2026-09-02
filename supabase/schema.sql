-- abatchan dashboard schema
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query -> Run).
--
-- Security model, in short:
--   * anon can READ published work and public settings. Nothing else.
--   * only the site owner or an account marked site_admin can manage content.
--   * secrets never live here. The DeepSeek key is a Vercel environment
--     variable read by /api/chat on the server. A key stored in this table
--     would be readable by anyone with the anon key, which is public by design.

-- ---------------------------------------------------------------- work items
create table if not exists public.work_items (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  kicker      text,                    -- card-meta, left  e.g. "developer tooling"
  status      text,                    -- card-meta, right e.g. "in development"
  category    text not null default 'product',   -- filter: product | platform | concept
  summary     text,
  image_path  text,                    -- path inside the "work" storage bucket
  image_alt   text,
  link_url    text,                    -- optional outbound link
  featured    boolean not null default false,    -- spans the full grid row
  position    int  not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists work_items_order_idx
  on public.work_items (published, position, created_at desc);

-- ------------------------------------------------------------------ settings
-- Key/value for editable copy and assistant configuration.
--   is_public = true  -> readable by anon, used to render the live site
--   is_public = false -> dashboard only
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists work_items_touch on public.work_items;
create trigger work_items_touch before update on public.work_items
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- policies
alter table public.work_items enable row level security;
alter table public.settings   enable row level security;

-- Do not treat every authenticated Supabase account as an administrator.
-- app_metadata is controlled by the project, unlike user_metadata. The email
-- clause keeps the existing owner account working during the transition.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'site_admin')::boolean, false)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'akinyughababajide@gmail.com'
$$;

drop policy if exists "published work is public" on public.work_items;
create policy "published work is public"
  on public.work_items for select
  to anon using (published = true);

drop policy if exists "signed in manages work" on public.work_items;
create policy "signed in manages work"
  on public.work_items for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "public settings are public" on public.settings;
create policy "public settings are public"
  on public.settings for select
  to anon using (is_public = true);

drop policy if exists "signed in manages settings" on public.settings;
create policy "signed in manages settings"
  on public.settings for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- -------------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('work', 'work', true)
on conflict (id) do nothing;

drop policy if exists "work images are public" on storage.objects;
create policy "work images are public"
  on storage.objects for select
  to anon using (bucket_id = 'work');

drop policy if exists "signed in uploads work images" on storage.objects;
create policy "signed in uploads work images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'work' and public.is_site_admin())
  with check (bucket_id = 'work' and public.is_site_admin());

-- Nika release archives. Private, deliberately: every build used to sit at a
-- public /downloads URL, which is what made a paid plugin free to anyone who
-- read the update manifest. There is no anon select policy here and there must
-- never be one. /api/download checks the licence key and then mints a signed
-- URL with the service key, which is the only way these bytes leave storage.
insert into storage.buckets (id, name, public)
values ('releases', 'releases', false)
on conflict (id) do update set public = false;

drop policy if exists "releases are never public" on storage.objects;
drop policy if exists "site admins manage releases" on storage.objects;
create policy "site admins manage releases"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'releases' and public.is_site_admin())
  with check (bucket_id = 'releases' and public.is_site_admin());

-- ------------------------------------------------------- editable site copy
-- Anything on the site tagged data-copy="<key>" is replaced by these values.
-- Add a row here and tag an element; no deploy needed.
insert into public.settings (key, value, is_public) values
  ('copy.home.eyebrow',   '"independent digital engineering studio"', true),
  ('copy.home.h1',        '"Build connected systems."',   true),
  ('copy.home.sub',       '"I design and build the interface, backend, integrations, and automation as one working product."', true),
  ('copy.contact.email',  '"abatchan4@gmail.com"',        true),
  ('copy.pricing.website','"$500"',                       true),
  ('copy.pricing.platform','"$2,500"',                    true),
  ('copy.pricing.system', '"$5,000"',                     true),
  ('assistant.enabled',   'true',                         true),
  ('assistant.suggestions','[{"label":"What makes Nika different?","description":"See the four core moves","question":"What makes Nika different?"},{"label":"How does WordPress setup work?","description":"Review the installation steps","question":"How does WordPress setup work?"},{"label":"Show me the product plans","description":"Compare Personal, Business, and Agency","question":"Show me the product plans"}]', true),
  ('assistant.model',     '"deepseek-v4-flash"',          false),
  ('assistant.system',    '"Sound like a warm, practical studio guide rather than a support script. Lead with the answer, keep it concise, and give one useful next step. Refer to the owner as Abat. Prices are starting points, never quotes. If a visitor needs a human decision or a fact you do not have, say so plainly and point them to the contact page."', false),
  ('news.items',          '[{"id":"2026-07-brand-and-assistant","tag":"what''s new","title":"Brand page, process, and an assistant","body":"The full brand system with downloadable lockups is up, along with how projects actually run. There is also a chat bubble now if you would rather ask than read.","href":"/brand","cta":"see the brand page","soon":false}]', true)
on conflict (key) do nothing;

-- Repair legacy seeds without overwriting a price the owner edited.
update public.settings
set value = '"$500"'::jsonb
where key = 'copy.pricing.website'
  and value in ('"$750"'::jsonb, '"$150"'::jsonb);

update public.settings
set value = '"$2,500"'::jsonb
where key = 'copy.pricing.platform'
  and value = '"$1,500"'::jsonb;

update public.settings
set value = '"$5,000"'::jsonb
where key = 'copy.pricing.system'
  and value = '"$3,500"'::jsonb;

-- ------------------------------------------------- assistant spend ceiling
-- Both counters in one statement so concurrent instances cannot lose an
-- update. The REST fallback in api/quota.js does the same work with a read
-- then a write, which undercounts under load; this does not.
--
-- The per-visitor cap tightens as the pool drains. A flat cap lets the first
-- arrivals take a full allowance each and leaves nothing for the tail of the
-- day; this spends the same budget but keeps late visitors served. The tiers
-- mirror capFor() in api/quota.js — change both together.
--
-- The usage key is a parameter because preview and production namespace their
-- counters; a shared row let a preview's smaller ceiling clamp the live count.
drop function if exists public.assistant_consume(text, text, int, int);

create or replace function public.assistant_consume(
  p_usage_key  text,
  p_ip_key     text,
  p_day        text,
  p_global_max int,
  p_ip_max     int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  spent int;
  cap   int;
  mine  int;
  used  int;
begin
  -- Pool state before spending, so the cap reflects what is left.
  select coalesce((value->>'count')::int, 0) into spent
  from public.settings
  where key = p_usage_key and value->>'day' = p_day;
  spent := coalesce(spent, 0);

  cap := case
    when spent < p_global_max * 0.5 then p_ip_max
    when spent < p_global_max * 0.8 then greatest(1, round(p_ip_max * 0.4)::int)
    else                                 greatest(1, round(p_ip_max * 0.17)::int)
  end;

  -- Per-connection first: one visitor must not be able to spend the day.
  insert into public.settings (key, value, is_public)
  values (p_ip_key, jsonb_build_object('day', p_day, 'count', 1), false)
  on conflict (key) do update
    set value = jsonb_build_object(
      'day', p_day,
      'count', least(
        case when settings.value->>'day' = p_day
             then coalesce((settings.value->>'count')::int, 0) + 1
             else 1 end,
        cap + 1))
  returning (value->>'count')::int into mine;

  if mine > cap then
    return jsonb_build_object('allowed', false, 'reason', 'ip_daily',
                              'used', 0, 'remaining', greatest(p_global_max - spent, 0),
                              'personal', 0, 'cap', cap);
  end if;

  -- The site's day. When the date rolls over the finished day is filed into
  -- history rather than overwritten, so there is something to size the ceiling
  -- against instead of guesswork.
  insert into public.settings (key, value, is_public)
  values (p_usage_key, jsonb_build_object('day', p_day, 'count', 1, 'history', '{}'::jsonb), false)
  on conflict (key) do update
    set value = jsonb_build_object(
      'day', p_day,
      'count', least(
        case when settings.value->>'day' = p_day
             then coalesce((settings.value->>'count')::int, 0) + 1
             else 1 end,
        p_global_max + 1),
      'history', case
        when settings.value->>'day' = p_day
          then coalesce(settings.value->'history', '{}'::jsonb)
        else coalesce(settings.value->'history', '{}'::jsonb)
             || jsonb_build_object(settings.value->>'day',
                                   coalesce(settings.value->'count', '0'::jsonb))
      end)
  returning (value->>'count')::int into used;

  if used > p_global_max then
    return jsonb_build_object('allowed', false, 'reason', 'daily',
                              'used', used, 'remaining', 0,
                              'personal', greatest(cap - mine, 0), 'cap', cap);
  end if;

  return jsonb_build_object('allowed', true, 'reason', null,
                            'used', used,
                            'remaining', greatest(p_global_max - used, 0),
                            'personal', greatest(cap - mine, 0),
                            'cap', cap);
end $$;

-- Only the service key may spend the budget. The publishable key is in every
-- browser on the site, so it must never be able to call this.
revoke all on function public.assistant_consume(text, text, text, int, int)
  from public, anon, authenticated;

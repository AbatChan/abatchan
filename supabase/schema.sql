-- abatchan dashboard schema
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query -> Run).
--
-- Security model, in short:
--   * anon can READ published work and public settings. Nothing else.
--   * authenticated (you, signed in) can do everything.
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

drop policy if exists "published work is public" on public.work_items;
create policy "published work is public"
  on public.work_items for select
  to anon using (published = true);

drop policy if exists "signed in manages work" on public.work_items;
create policy "signed in manages work"
  on public.work_items for all
  to authenticated using (true) with check (true);

drop policy if exists "public settings are public" on public.settings;
create policy "public settings are public"
  on public.settings for select
  to anon using (is_public = true);

drop policy if exists "signed in manages settings" on public.settings;
create policy "signed in manages settings"
  on public.settings for all
  to authenticated using (true) with check (true);

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
  to authenticated using (bucket_id = 'work') with check (bucket_id = 'work');

-- ------------------------------------------------------- editable site copy
-- Anything on the site tagged data-copy="<key>" is replaced by these values.
-- Add a row here and tag an element; no deploy needed.
insert into public.settings (key, value, is_public) values
  ('copy.home.eyebrow',   '"digital engineering studio"', true),
  ('copy.home.h1',        '"Build connected systems."',   true),
  ('copy.home.sub',       '"We design and engineer the interfaces, infrastructure, and integrations behind modern digital products."', true),
  ('copy.contact.email',  '"abatchan4@gmail.com"',        true),
  ('copy.pricing.website','"$750"',                       true),
  ('copy.pricing.platform','"$1,500"',                    true),
  ('copy.pricing.system', '"$3,500"',                     true),
  ('assistant.enabled',   'true',                         true),
  ('assistant.greeting',  '"Hi. Ask me anything about the work, pricing, or how a project runs."', true),
  ('assistant.model',     '"deepseek-v4-flash"',          false),
  ('assistant.system',    '"You are the assistant on abatchan.com, a digital engineering studio. Answer briefly and concretely about services, pricing and process. Websites start at $750, platforms at $1,500, connected systems at $3,500 — always say these are starting points, not quotes. Never invent a firm quote or a delivery date. If you do not know, say so and point to the contact page."', false),
  ('news.items',          '[{"id":"2026-07-brand-and-assistant","tag":"what''s new","title":"Brand page, process, and an assistant","body":"The full brand system with downloadable lockups is up, along with how projects actually run. There is also a chat bubble now if you would rather ask than read.","href":"/brand","cta":"see the brand page","soon":false}]', true)
on conflict (key) do nothing;

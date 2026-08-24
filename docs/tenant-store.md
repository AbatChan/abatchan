# Tenant record store

Tenant records are private rows in the existing Supabase `settings` table. The
row key is `assistant.tenant.<siteKey>`, the JSON value is the complete tenant
record, and `is_public` must be `false`. The browser never reads these rows;
Vercel functions use `SUPABASE_SECRET_KEY` to resolve them.

## First migration

Inspect the two records that will be written:

```sh
SUPABASE_URL=https://PROJECT.supabase.co node scripts/seed-tenants.mjs
```

Then supply the server secret and apply the upsert:

```sh
SUPABASE_URL=https://PROJECT.supabase.co \
SUPABASE_SECRET_KEY=sb_secret_... \
node scripts/seed-tenants.mjs --apply
```

Run this before deploying the tenant-store code. The site deliberately does
not fall back to records bundled into the deployment: a missing or unknown key
must never receive another tenant's guide.

## Runtime settings

- `PRIMARY_SITE_KEY` defaults to `site_abatchan_live` and identifies the tenant
  used for same-origin requests that omit a key.
- `TENANT_CACHE_TTL_MS` defaults to 60000. A changed record becomes visible to
  warm functions after that interval; cold functions read it immediately. A
  warm function retains its last verified record if a refresh temporarily
  fails, while a cold function fails closed.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or the legacy
  `SUPABASE_SERVICE_KEY`) are required in Preview and Production.

New tenants can be created by inserting another private settings row. A deploy
is no longer required for resolution, prompt composition, origin preflight, or
public widget configuration.

# Nika release archive

Every build ever shipped, kept. Nothing in this folder is published.

## Why it moved

This was `downloads/`, and the deploy serves the repository root, so all 115
builds of a paid plugin sat at guessable public URLs. The update manifest beside
them named the newest one, so guessing was not even required. Anyone who found
one filename had the product.

`releases/` is listed in `.vercelignore`, so it is not uploaded to Vercel at all.
Absence is the protection: on a static deploy any file that is uploaded has a
URL, and no routing rule is as reliable as not shipping the bytes.

## How a build reaches a customer now

1. `node scripts/build-nika-products.mjs` writes the zips here.
2. `node scripts/publish-release.mjs <version>` uploads them to the private
   `releases` bucket in Supabase. That bucket has no anon select policy and must
   never be given one.
3. `/api/update` answers the plugin's update check. Version and changelog come
   back to anyone; the `package` URL is minted only for a valid Nika key whose
   update term is running, and it expires within the hour.
4. `/api/download` exchanges a licence key, or one of those signed grants, for a
   short-lived Supabase URL.

## Keep the old zips

The immutability point below still holds, and now has a second reason: a lapsed
customer may download any version they were served during their term, which is
recorded as a high-water mark per licence. Deleting an old build takes something
away from someone who paid for it.

WordPress package URLs are immutable release artifacts. Do not delete or replace
a published `nika-site-guide-x.y.z.zip`: WordPress and intermediary caches may
continue using a manifest that points to that exact URL after a newer release
goes live.

## The one break, and it is deliberate

Plugins at 1.5.2 and earlier check `https://abatchan.com/downloads/nika-site-guide-update.json`,
which no longer exists. They will not crash and Nika keeps running; they simply
stop being offered updates until 1.5.3 is installed by hand.

There is no way around this that does not involve leaving a build public, so the
one-time manual update belongs in the licence migration email, which every
existing buyer receives anyway because they all need a key.

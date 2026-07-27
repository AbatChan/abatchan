# abatchan — handover

Read this before changing anything. It exists because this codebase has a few
non-obvious rules, and breaking them has already cost a full day of rework.

---

## 1. What this actually is

**Plain static HTML, CSS and JavaScript. No framework, no build step.**

There is no `package.json`, no `next.config`, no `node_modules`, no React.
The branch is *named* `dev/nextjs-liquid-glass` for historical reasons only —
it is not a Next.js project. Do not "migrate" it or add a bundler unless that
is the explicit task.

```
index.html work.html about.html pricing.html contact.html
brand.html process.html privacy.html terms.html 404.html
styles.css          all styling, one file
script.js           all behaviour, one file
supabase-config.js  tiny fetch client, no SDK
admin.html          dashboard (login + editor)
api/chat.js         Vercel function, assistant proxy
supabase/schema.sql run once in Supabase
assets/             logos, symbols, video
```

Hosting is Vercel with `cleanUrls: true`, so `/work` serves `work.html`.

---

## 2. Rules that will break the site if ignored

### 2.1 `styles.css` is the only owner of CSS

**Never inject a `<style>` element from `script.js`.**

`index.html` loads `/styles.css` in `<head>`. A `<style>` appended at runtime
lands *after* it and wins every same-specificity tie. Successive edits done that
way kept appending to the end of one template literal without deleting the rule
being replaced. At the worst point a single sheet held **5 `@media(max-width:900px)`
blocks and 11 `--glass-tint` declarations**, only the last of each live. Reading
the file no longer told you what was in effect, so every new fix was made against
stale values and the page got progressively worse. Seven commits, then a revert.

Edit the existing rule. Do not add a competing one.

### 2.2 Prefer specificity over `!important`

Two real bugs came from this:

- `.brand img` in the base sheet out-specified `.brand-lockup`, shrinking the
  wordmark to a 32px square.
- `.mobile-tabs>*` out-specified `.glass-edge`, turning the glass rim into a
  grid item that shoved the tab bar sideways.

Both were fixed by writing a more specific selector, not by escalating.

### 2.3 Page-level `<style>` blocks must be namespaced

`brand.html` uses `.brand-*`, `404.html` uses `.nf-*`. Page CSS loads *after*
`styles.css`, so an unnamespaced rule silently overrides the shared one. This
already happened once: `pricing.html` had its own `.faq-list summary:after`
which fought the shared accordion marker and drew two glyphs.

### 2.4 No em dashes in copy

`script.js` rewrites every `—` to `", "` across all text nodes. A heading
written as `01 — the name` renders as `01 , the name`. Use `·` or a colon.

### 2.5 Never merge to `main` without an explicit launch decision

`main` serves the Coming Soon page with `noindex,nofollow`. Merging `dev` into
`main` **is the launch**, not a bug-fix deploy. All work goes on
`dev/nextjs-liquid-glass` and is reviewed on the Vercel preview.

---

## 3. Shared components — change once, not per page

| Thing | Defined in | Notes |
|---|---|---|
| Nav (desktop + mobile tabs) | `NAV` array in `script.js` | One row adds a destination to both navigations. Pages carry empty `<header class="site-header">` and `<nav class="mobile-tabs">`. |
| Footer + secondary menu | `FOOTER_NAV` in `script.js` | Pages carry an empty `<footer>`. |
| Buttons | `.btn` in `styles.css` | Variants `.primary`, `.chip`, `.sm`. There is no `.pill` any more. |
| Button arrows | `ARROW_DIR` in `script.js` | Normalises `↗ → ↓ ↘` into `<span class="arrow">` at runtime and sets the direction. Pages do not need to remember the markup. |
| System diagrams | `.sysmap` + `[data-sysmap]` | Connectors are measured from real node positions and drawn as SVG. Node placement is data: `style="--x:15%;--y:15%"`. `data-unlinked` opts a node out of connectors (used by 404). |
| Tooltips | `data-tip="…"` | One floating element on `<body>`. Do not use native `title=`; it is slow, unstyled, and would be clipped by the header's `overflow:hidden`. |
| Theme | lamp pull cord in `script.js` | Verlet rope. Writes one SVG path + one transform per frame. **Never animate `height` or any layout property per frame** — that was the original lag. |
| Announcements | `settings` key `news.items` | Falls back to `NEWS_FALLBACK` in `script.js`. |

---

## 4. Verification — read this before trusting a test

Headless Chrome **does not paint** in `--dump-dom` mode. Three consequences that
have already produced false "this is broken" conclusions:

1. **`requestAnimationFrame` never fires.** Anything driven by an animation loop
   (the lamp, scroll handlers deferred to rAF) appears frozen.
2. **CSS transitions never advance.** `getComputedStyle` returns the *start*
   value, so a correct colour reads as the wrong one.
3. **`scroll` events are not dispatched** after `window.scrollTo`.

Workarounds that do work: dispatch the event manually
(`window.dispatchEvent(new Event('scroll'))`), inject
`*{transition:none!important}` before measuring, and use `--screenshot` when you
need real paint. Also note `position:fixed` elements render at `top + scrollY`
in screenshots taken after a programmatic scroll, and Chrome clamps
`--window-size` to a 500px minimum width — use an iframe for phone widths.

**A structural check that only counts braces is not enough.** An edit bug once
inflated `styles.css` from 53 KB to **102 MB** and the brace count still
balanced. Assert file size too.

---

## 5. What is done

- All 10 pages built and styled, dark + light, responsive to 320px.
- Liquid-glass header and mobile dock. Chrome ignores `url()` in
  `backdrop-filter`, so refraction is done with hue-split rim strips instead —
  **do not "fix" this by reintroducing `feDisplacementMap` on the backdrop, it
  is a verified no-op.**
- One button system, one nav definition, one diagram component.
- Verlet pull-cord theme switch: holds at its limit while held, fires on
  release, latches once the limit is reached, works with touch and keyboard.
- Assistant bubble and panel, answering from canned replies until an endpoint
  exists.
- Custom tooltips, animated FAQ accordion, staggered page transition,
  scrollspy sidebar on the document pages.
- SEO: unique titles/descriptions/canonicals, JSON-LD on indexable pages,
  sitemap, `noindex` on privacy/terms/404.

## 6. What is NOT done

1. **`admin.js` does not exist.** `/admin` loads and renders, but nothing works —
   no login, no saving. This is the next task.
2. **`/work` does not read from the database.** Work cards are still hardcoded
   in `work.html`.
3. **Site copy is not wired.** The `settings` rows exist and the dashboard is
   designed for them, but no element on the public site reads them yet. The
   intended mechanism is `data-copy="key"` attributes replaced at runtime.
4. **The assistant is not connected.** `ASSISTANT.endpoint` is `null`, so it
   uses local canned answers.
5. Work-card hover parallax, scroll-velocity glass, idle drift on the system
   map — suggested, not built.

---

## 7. Setup the owner must do (cannot be done from code)

### 7.1 There is no admin username or password

Authentication is Supabase Auth. **No credentials exist anywhere in this
repository, and none should ever be committed.** Create the account yourself:

1. Create a project at supabase.com.
2. **SQL Editor → New query →** paste `supabase/schema.sql` → Run.
3. **Authentication → Users → Add user**, enter your email and a password you
   choose, and tick *Auto Confirm User*.
4. **Authentication → Providers → Email:** turn **off** "Enable sign ups", so
   only you can ever have an account.
5. **Settings → API:** copy *Project URL* and the *anon public* key into
   `supabase-config.js`.

That email and password are your dashboard login. The `anon` key is safe to
commit — it is public by design and every request it makes is filtered by the
row-level-security policies in the schema. **The `service_role` key must never
appear in any file served to a browser.**

### 7.2 Assistant

Add `DEEPSEEK_API_KEY` in Vercel → Settings → Environment Variables, then set
`ASSISTANT.endpoint` to `'/api/chat'` in `script.js`.

The key is **deliberately not editable from the dashboard**. Anything stored
there is readable by anyone who opens the site, because the browser needs the
public key to fetch it. The dashboard manages the model, greeting and system
prompt only.

DeepSeek was chosen over GPT-4o-mini and Gemini Flash-Lite because its automatic
prompt caching gives ~98% off repeated input, and a site assistant sends the
same system prompt every turn.

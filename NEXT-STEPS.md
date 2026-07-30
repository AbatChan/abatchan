# abatchan.com — what to build next

Written 30 July 2026, for whoever picks this up next. Self-contained: assume no
prior conversation. Read "How this site works" before changing anything, because
two of the rules there have already caused live bugs.

---

## How this site works

- **Static HTML + vanilla JS. No framework, no build step.** Each page is a
  hand-written `.html` file at the repo root. There is no bundler.
- **Hosting: Vercel.** Deploy with `vercel deploy --prod` from
  `website-preview/`. There is **no GitHub → Vercel integration** — pushing to
  GitHub does not deploy. Deploys are CLI-only and come from the working
  directory, not from a commit.
- **Data: Supabase.** Table `public.settings` is a key/value store
  (`key`, `value` jsonb, `is_public`). `is_public = true` rows are readable by
  the browser with the publishable key; `false` rows are server-only.
  Portfolio items live in `public.work_items`.
- **Serverless: one function.** `api/chat-stream.js` is the site assistant.
  `api/quota.js` is its spend ceiling. `api/chat.js` was deleted — do not
  reintroduce a second route (see "Do not repeat these").
- **Admin dashboard: `/admin`.** Supabase-auth gated, edits `settings` rows.

### Rule 1 — bump the cache-bust version or your change will not ship

Every page loads assets with a query string: `/script.js?v=12`,
`/styles.css?v=12`, `/admin.js?v=14`, `/admin-polish.css?v=15`.

**If you edit a JS or CSS file and do not bump its `?v=` in every HTML file that
loads it, returning visitors keep the cached old version.** You will test in a
fresh browser, see it working, and ship a no-op for everyone else. This has
already happened once here.

```bash
# bump script.js everywhere, then verify nothing stale remains
python3 - <<'PY'
import glob, io
for p in glob.glob('*.html'):
    s = io.open(p, encoding='utf-8').read()
    io.open(p, 'w', encoding='utf-8').write(s.replace('/script.js?v=12', '/script.js?v=13'))
PY
grep -ohE '/script\.js\?v=[0-9]+' *.html | sort -u   # expect exactly one line
```

Careful with `grep`/`replace` on `admin.js`: the strings `faq-admin.js` and
`reviews-admin.js` both *contain* `admin.js`. Always match with the leading
slash (`/admin.js?v=`).

### Rule 2 — preview and production share one Supabase project

Preview deployments read and write the **same** database as production. Counters
are namespaced by `VERCEL_ENV` (see `api/quota.js`), but anything you write
directly to `settings` from a preview lands in live data.

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Notes |
|---|---|---|
| `ASSISTANT_DAILY_MAX` | `600` | Site-wide assistant messages per day |
| `ASSISTANT_IP_DAILY_MAX` | `30` | Base per-visitor cap, before graduation |
| `ASSISTANT_EXEMPT_IPS` | owner IP | Comma-separated. Skips the ceiling entirely |
| `DEEPSEEK_API_KEY` | secret | Model provider |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | secret | Server-side only |

`supabase/schema.sql` holds the schema **and** the `assistant_consume()`
function. That function is applied by pasting it into the Supabase SQL editor —
it is not migrated automatically. If you change the tier percentages in
`capFor()` in `api/quota.js`, change them in the SQL too; they are duplicated on
purpose (SQL is the fast path, JS is the fallback) and must agree.

---

## Current state

Working and verified:

- Assistant spend ceiling: 600/day site-wide, per-visitor cap graduating
  30 → 12 → 5 as the pool drains. Atomic in Postgres, with a REST fallback.
- Assistant refuses to do free engineering work, refuses prompt extraction
  (including "continue this line" attacks), and refuses claimed authority
  ("I am the owner"). Backed by a server-side canary scan in
  `api/chat-stream.js`, not by prompt wording alone.
- Social profiles and exempt IPs are editable in `/admin`.
- The site ranks **#1 on Google for "abatchan"**, with `/about` second.

---

## The work

Items 1–4 share one root cause and should be done together. Item 5 is separate.
Item 6 is the positioning gap and depends on 1 and 3. Item 7 is owner-only.

---

### 1. Server-render `/reviews`

**Problem.** `reviews.html` is ~4.7 KB served, and almost all of that is a
JSON-LD blob. The 26 real client reviews live in `reviews-data.js` as
`window.ABATCHAN_REVIEW_DEFAULTS` and are injected into the DOM by `reviews.js`
after load. A crawler that does not execute JavaScript sees an empty page.

**Why it matters.** Google does render JavaScript, but on a delayed second pass
with a limited budget, and new low-authority domains get the least of it. Right
now Google's AI Overview for `abatchan.com` describes the business by citing
**Instagram and a third-party site** rather than abatchan.com — because the
site's own pages give it little to read. Reviews are the strongest sales asset
on the site and are currently invisible.

**Data flow to preserve.** Reviews come from one of two places, in this order:

1. Supabase `settings` row `reviews.items` (public) — what the dashboard writes.
2. `window.ABATCHAN_REVIEW_DEFAULTS` in `reviews-data.js` — the fallback.

See `reviews.js` around lines 238–246.

**Approach.** Add a prebuild step that writes the review markup into
`reviews.html` before deploy, and let the existing JS hydrate over it for
visitors.

- Vercel already attempts `npm run vercel-build`. Add a `package.json` with that
  script pointing at a small Node file (e.g. `build/prerender.mjs`).
- The script fetches `reviews.items` from Supabase with the **publishable** key
  (this is public data — do not use the secret key in a build artifact). Falls
  back to parsing `reviews-data.js` if the row is absent.
- It injects the same markup `reviews.js` produces into a placeholder container
  in `reviews.html`, then `reviews.js` replaces it on load as it does today.

**Accept this trade-off explicitly:** crawlers get a snapshot from the last
deploy; visitors always get live data. A review edited in the dashboard will not
change the server-rendered HTML until the next deploy. That is the right call
here — but say so, don't let it be discovered.

**Acceptance test**

```bash
curl -s https://abatchan.com/reviews | grep -c "Akinyugha did an amazing job"   # expect 1, currently 0
curl -s https://abatchan.com/reviews | wc -c                                    # expect >> 4745
```

Then in a browser: the page must look **identical** to now, with no flash of
duplicated reviews as JS hydrates.

---

### 2. Server-render `/work` and the footer

**Problem.** Two more places, but note `/work` is a *different* problem from
`/reviews` — check this before assuming.

- **`/work` is stale, not empty.** `work.html` contains **3 hardcoded work
  cards** in static HTML (AI.EXE, Estimatio AI, Smart motorcycle dashboard).
  Supabase currently has **5 published items** — `AskForTransparency` and
  `abatchan brand` exist for visitors but are invisible to crawlers.
  `dynamic-work.js` (lines ~136, ~155) replaces the static set with the live one
  on load. So a crawler sees a hardcoded subset that silently drifts every time
  the dashboard changes, while visitors see the real list. Prerendering fixes
  both the drift and the two missing items.
- **The `<footer>` is empty in served HTML on every page.** `script.js` fills it
  via `qa('footer').forEach(...)` (~line 363), including the footer navigation to
  `/brand`, `/reviews`, `/privacy`, `/terms` and the 11 social links. Those
  internal links are invisible to a non-rendering crawler, which weakens
  internal linking sitewide.

**Approach.** Extend the same prebuild script. Work items come from Supabase
(`work_items`, published only, ordered by `position`). The footer is static
markup and can simply be written into each HTML file at build time, with
`script.js` left to overwrite it (harmless) or adjusted to skip if already
populated.

**Acceptance test**

```bash
# the two published items currently missing from served HTML — both are 0 today
curl -s https://abatchan.com/work | grep -c "AskForTransparency"
curl -s https://abatchan.com/work | grep -c "abatchan brand"

# footer, invisible on every page today
curl -s https://abatchan.com/        | grep -c "social-chip"    # expect 11, currently 0
curl -s https://abatchan.com/pricing | grep -c 'href="/terms"'  # expect >= 1, currently 0
```

Do **not** use `Estimatio` as the acceptance check — it is already in the static
HTML and would pass without you having built anything.

---

### 3. `Review` + `AggregateRating` structured data

**Problem.** No review schema anywhere, so no star ratings in search results.

**Why it matters.** This is the single most visible way to stand out in a list
of ten blue links, and the competing Nigerian studios mostly do not have it.
There are 26 genuine Upwork and Fiverr reviews to back it, so this is legitimate
markup, not manufactured.

**Requirement.** Google only grants review rich results when the review text is
**actually present in the served HTML** — which is why this depends on item 1.
Do not add the schema before the content is server-rendered; it will be ignored
at best and flagged at worst.

**Approach.** In `reviews.html`, emit an `ItemList` of `Review` nodes plus an
`AggregateRating` on the `ProfessionalService` node. Each `Review` needs
`author`, `reviewBody`, `reviewRating`, and `datePublished` where known. Some
reviews in `reviews-data.js` are undated — omit `datePublished` for those rather
than inventing one.

**Do not** attach `AggregateRating` to every page. It belongs on the entity, once.

**Acceptance test.** Paste the URL into
`https://search.google.com/test/rich-results` — expect "Review snippets"
detected with zero errors.

---

### 4. `FAQPage` structured data on `/pricing`

**Problem.** `pricing.html` already contains a real FAQ (`.pricing-faq` /
`.faq-list`) in static HTML, with no schema on it.

**Why it matters.** Cheapest win on this list — the content already exists and
is already server-rendered. FAQ rich results expand your result's height in the
listing.

**Approach.** Generate a `FAQPage` JSON-LD block from the existing markup.
Question and answer text must match the visible text exactly.

**Acceptance test.** Rich Results Test on `/pricing` → "FAQ" detected, no errors.

---

### 5. Per-page structured data

**Problem.** Every page currently ships the *identical* JSON-LD blob:
`ProfessionalService` + `WebSite`. Nothing distinguishes `/pricing` from
`/about`.

Note `script.js` now rewrites the `sameAs` array client-side to match the
dashboard's social links (added ~line 530). That is useful but only reaches
crawlers that execute JS — the served HTML still carries the original list.
Consider having the prebuild script from item 1 write `sameAs` into the static
HTML too, so both paths agree.

**Approach.**
- `/pricing` → `Service` / `OfferCatalog` with the published starting prices.
- `/work` → `ItemList` of `CreativeWork`.
- `/about` → `Person` for Abat, linked to the studio via `worksFor`.
- All pages → `BreadcrumbList`.

Keep one `ProfessionalService` entity, referenced by `@id`, rather than
redeclaring it differently per page.

---

### 6. Say what the studio actually does

**This is the biggest missed opportunity on the site, and it is not technical.**

Searched Google on 31 July 2026 across brand, local and service terms. Findings:

| Query | Where abatchan.com sits | Who wins |
|---|---|---|
| `abatchan` | **#1**, `/about` #2 | — |
| `web developer Akure Nigeria` | not in top 20 | Directories (TechBehemoths, Sabi Programmers, StarOfService), Upwork, local agencies |
| `BookingKoala developer customization` | absent | BookingKoala's own docs, YouTube, **one** Upwork profile |
| `hire BookingKoala expert cleaning service website` | absent | BookingKoala's own pages, **Fiverr and Upwork gigs only** |
| `GoHighLevel automation developer for cleaning business` | absent | `hireghldeveloper.com`, `hiregohighleveldeveloper.com`, `cleaningservicesghlsnapshot.com` |

**The gap.** For BookingKoala, page one is the vendor's own documentation plus
marketplace listings. **No independent studio or agency site ranks at all.** By
contrast the GoHighLevel + cleaning niche is already contested by purpose-built
exact-match-domain sites, so it is much harder.

**What the 26 reviews actually evidence** (counted from `reviews-data.js`):

- BookingKoala — 4 separate engagements, 6 mentions in quotes
- GoHighLevel / GHL — 8 mentions
- Cleaning-service businesses — 3 engagements
- Plus WordPress, Wix, Kartra, OwnerRez, Elementor, Bandzoogle migrations

**What the site says about any of that: nothing.** `BookingKoala` appears only
inside `reviews.html`. `GoHighLevel`, `cleaning`, `Kartra`, `OwnerRez` and
`Elementor` appear on **no page at all**. The homepage sells "web products,
dashboards, automation, APIs, and the infrastructure behind them" — which
competes with every agency on earth and matches no specific search.

So the studio has demonstrable, review-backed expertise in a niche where nobody
owns the search term, and the website does not mention it.

**Approach.** Add a dedicated, genuinely useful service page — e.g.
`/bookingkoala` — covering setup, customisation, integration and repair, with
the real BookingKoala reviews shown as proof. Not a thin landing page; the
competition is vendor documentation, so it has to be worth reading. Consider a
second page for cleaning-service websites.

**Sequencing matters:** this depends on items 1 and 3. A page whose proof is
invisible to crawlers cannot rank on the strength of that proof. Server-render
the reviews first.

**Also worth doing, cheap:** the directories that beat you locally
(TechBehemoths, Sortlist, StarOfService, Sabi Programmers) take submissions.
Listings there are both local visibility and backlinks. The Behance profile
already ranks for "Website Designer in Akure, Nigeria" — make sure it links to
abatchan.com.

---

### 7. Google Search Console — owner only

**Cannot be delegated.** It needs the owner's Google account.

1. Add `abatchan.com` at `https://search.google.com/search-console`.
2. Verify via DNS TXT record, or the existing Vercel domain integration.
3. Submit `https://abatchan.com/sitemap.xml` (8 URLs, already live and correct).
4. Use URL Inspection on `/work`, `/pricing`, `/reviews` and request indexing.

**Why it matters now.** The site ranks #1 for its brand name, but only `/` and
`/about` are surfacing in results. Search Console is the only way to see which
pages Google actually holds, and it is how you confirm whether items 1–4 worked.
Without it you are guessing.

---

## Do not repeat these

Each of these was a real bug shipped here. They are cheap to reintroduce.

- **Two routes, two prompts.** There used to be `/api/chat` alongside
  `/api/chat-stream`, each with its own separately-written system prompt. They
  drifted: one forbade debugging visitors' code, the other did not, and the one
  that did not was the one every visitor hit. `/api/chat` is deleted. Keep one
  route.
- **Prompt wording alone does not stop prompt extraction.** Blocking one
  phrasing of "continue this line" moved the leak to another phrasing, and
  fixing one line broke a different one. The durable defence is the `CANARIES`
  scan in `api/chat-stream.js`, which checks the outgoing stream before flushing.
  If you edit `ROLE` or `GUIDE`, **update `CANARIES` to match** — it holds
  literal fragments of those strings.
- **`.assist-send` needs an explicit height.** The form uses
  `align-items: flex-end` so the textarea can grow; that removed the default
  `stretch` the button had silently relied on, and it collapsed to nothing.
- **`.assist-msg.bot a` captures the error block's buttons.** The error card is
  itself a `.bot` message, so a bare `a` selector repaints its action buttons as
  underlined indigo text and outranks `.assist-error-actions .btn`. The rule is
  now `:not(.btn)`.
- **`social.links` no longer falls back when empty.** An empty array means "hide
  every profile" (intentional). The cost is that a malformed hand-edit in
  Supabase silently empties the footer rather than falling back to the built-in
  list in `script.js`.
- **Do not test the assistant against production limits.** Add your IP to
  `ASSISTANT_EXEMPT_IPS`, or you will spend the visitors' daily budget. Roughly
  110 of 300 went that way in one afternoon before the exemption existed.
- **Do not lower a limit on preview to test a blocked state** unless you
  understand that `assistant_consume` clamps with `least(count + 1, max + 1)` —
  a preview running a smaller ceiling drags the shared stored count down to it.

---

## Test suites

Written for Node, no framework, no network. Run before every deploy.

```bash
node --check api/quota.js && node --check api/chat-stream.js \
  && node --check script.js && node --check admin.js
```

The three offline suites covering the quota ladder, the streaming handler's
error payloads, and the graduated cap live in `tests/`. They stub `fetch`, do
not touch Supabase or spend budget, and run together with:

```bash
node tests/run.mjs
```

For the assistant's refusals there is an adversarial battery of 38 probes
(prompt extraction, secret extraction, free engineering, claimed authority,
persona switching, commercial integrity, page-content injection). Each probe
declares a regex that must *not* appear in the reply. Re-run it after any prompt
change. Note that some failures are **intermittent** — one probe leaked 5/5 on
one deploy and 0/5 on the next, so a single passing run proves nothing. Run
repeats. These live-network checks are in `tests/live/` and refuse to start
unless `LIVE_ASSISTANT_TESTS=1` is set. Confirm the calling IP is exempt first.

---

## Suggested order

1. `package.json` + prebuild script skeleton (unblocks 1, 2, 5)
2. Server-render reviews (item 1) — verify with `curl`, then the browser
3. Server-render work and footer (item 2)
4. Review + AggregateRating schema (item 3) — only after 1 is live
5. FAQPage on pricing (item 4) — independent, can be done any time
6. Per-page schema (item 5)
7. Service page for the BookingKoala niche (item 6) — after 1 and 3 are live
8. Owner: Search Console (item 7), then re-inspect the pages above

Do not batch 1–4 into a single deploy. Ship item 1, confirm with `curl` that the
review text is in the served HTML, and only then add the schema that depends on
it. Debugging structured data and a rendering change at the same time is how you
end up unable to tell which one broke.

# /admin — specification

What the dashboard is, screen by screen. `admin.html` already implements the
markup and styling for everything below except **Announcements**; `admin.js`
does not exist yet, so nothing is wired.

Read `HANDOVER.md` first — the CSS ownership rule and the verification traps
apply here too.

---

## 0. Principles

1. **It edits the live site.** There is no publish pipeline and no deploy step.
   Saving writes to Supabase and the public pages read it on next load. This is
   why `published` and dismissible drafts matter.
2. **It borrows the site's design system.** `admin.html` links `/styles.css` and
   uses `.btn`, `.field`, `--ink/--paper/--signal`, the same fonts. Dashboard-only
   rules are namespaced `.adm-*`. Do not fork the tokens.
3. **It must not become a security hole.** Everything the browser can read, the
   public can read. See §7.
4. **It is used from a phone.** Not a desktop-only tool — see §8.

---

## 1. Authentication

**Screen: gate** (`#gate`, shown when there is no valid session)

| Element | Behaviour |
|---|---|
| Wordmark | Static, sets the tone. |
| Email field | `type=email`, `autocomplete=username`, required. |
| Password field | `type=password`, `autocomplete=current-password`, required. |
| Sign in button | `.btn.primary`, shows a pending state while the request is in flight and is disabled during it. |
| Message line | Errors in plain language. Never leak whether the email exists — one message for all failures: *"That email and password do not match."* |

Behaviour:

- On load, if a stored session exists, try it. If the access token is expired,
  call refresh once before showing the gate.
- On success, store `{access_token, refresh_token, expires_at}` and show the app.
- Wrong credentials must **not** clear the typed email.
- Rate limiting is Supabase's, not ours. Do not build a lockout.
- **Sign-ups must be disabled in the Supabase console** so the gate cannot mint
  accounts. There is no "register" link and there must never be one.
- Sign out clears storage and returns to the gate.

Session expiry mid-use: any request returning 401 should attempt one silent
refresh, retry once, and only then bounce to the gate with the work preserved
in memory if possible.

---

## 2. Shell

- **Sidebar** with the wordmark, four tabs, the signed-in email, *sign out*, and
  *view site* (opens `/` in a new tab).
- **Tabs:** Work · Site copy · Assistant · Announcements.
- Active tab carries `aria-current="true"`.
- Switching tabs with unsaved changes must warn before discarding.
- A **toast** (`#toast`) confirms saves and reports failures. Success is neutral,
  failure uses `.bad`. It is `role="status"` and `aria-live="polite"`.

---

## 3. Work

### 3.1 List

One row per item, ordered by `position`, drafts included.

Each row shows: thumbnail, title, summary (2 lines max), and tag chips for
category, `published`/`draft`, and `featured`.

Row actions: **move up**, **move down**, **edit**, **delete**.

- Move buttons swap `position` with the neighbour and persist immediately.
  First row cannot move up, last cannot move down — disable, don't hide.
- Delete asks for confirmation naming the item, then removes the row **and its
  image from storage**. An orphaned image is a silent storage leak.
- Empty state explains what to do rather than showing a bare "no items".

### 3.2 Editor

| Field | Type | Rules |
|---|---|---|
| image | file drop + click | Accepts image/\*. Preview immediately from a local object URL, before upload. |
| title | text | Required. |
| slug | text | Required, `[a-z0-9-]+`, unique. Auto-derived from title while the slug is untouched; stops auto-updating once hand-edited. |
| kicker | text | Card meta, top left. e.g. *developer tooling* |
| status | text | Card meta, top right. e.g. *in development* |
| category | select | `product` \| `platform` \| `concept` — drives the work-page filter chips. |
| link | text | Optional outbound URL. Must be `https://` or start with `/`. |
| summary | textarea | Card body copy. |
| image alt | text | Required **when an image is present**. Accessibility, not optional. |
| featured | checkbox | Spans the full grid row. |
| published | checkbox | Off means the public site never sees it. |

Editor actions: **save**, **cancel**, **delete**.

Upload rules:

- Reject files over ~5 MB with a clear message rather than failing silently.
- Downscale client-side to a sensible max (≈2000px on the long edge) before
  upload — a 12 MP phone photo must not become the work page's payload.
- Store at `work/<slug>-<timestamp>.<ext>`. The timestamp defeats CDN caching
  when an image is replaced.
- Replacing an image deletes the previous object.
- Show upload progress or at minimum a pending state; a large upload on mobile
  data is not instant.

Validation happens before any network call, and the first invalid field gets focus.

---

## 4. Site copy

A list of `settings` rows whose key starts with `copy.`, rendered as labelled
fields. Long values become textareas, short ones inputs.

- The key is shown next to each field, because the key is what the page looks
  for. Someone editing `copy.home.h1` should see that string.
- Save writes all changed rows in one upsert.
- Unknown keys added to the table appear here automatically. This is the
  extension mechanism — no code change to add an editable string.

**The public side is not built yet.** The intended mechanism: elements tagged
`data-copy="copy.home.h1"` have their text replaced at runtime from a single
settings fetch, falling back to whatever is already in the HTML. That fallback
matters — the site must render correctly with Supabase unreachable.

---

## 5. Assistant

| Field | Notes |
|---|---|
| enabled | Hides the bubble site-wide when off. |
| greeting | First message in the panel. |
| system prompt | The model's instructions. Long textarea. |
| model | Free text, e.g. `deepseek-chat`. |

Plus a permanent note explaining that the **API key is not here** — see §7.

Optionally (nice, not required): a test box that sends one message through
`/api/chat` and shows the reply, so the prompt can be tuned without leaving the
dashboard.

---

## 6. Announcements — *not yet in `admin.html`*

Edits the `news.items` setting, a JSON array. The public site shows the first
item the visitor has not dismissed.

Per item:

| Field | Notes |
|---|---|
| id | Required, unique, stable. **Changing an id re-shows the card to everyone who already dismissed it** — that is the intended way to re-announce, and must be explained in the UI. |
| tag | Small label. Defaults to *what's new*, or *coming soon* when `soon` is set. |
| title | Short. |
| body | Two or three lines. |
| href + cta | Optional link and its label. |
| soon | Marks it as upcoming rather than shipped; renders amber with a pulse. |

Actions: add, edit, reorder, delete. A **preview** showing the card exactly as
visitors see it is worth more here than anywhere else, because the component is
small and easy to overfill.

---

## 7. Security — non-negotiable

- **No secret belongs in this dashboard.** Anything stored in `settings` and
  marked `is_public` is readable by anyone with the anon key, which ships in
  `supabase-config.js` by design. The DeepSeek key lives as `DEEPSEEK_API_KEY`
  in Vercel and is read only by `/api/chat` on the server.
- The `service_role` key must never appear in any browser-served file.
- Row level security is the real boundary, not the UI. The policies in
  `supabase/schema.sql` allow anon to read published work and public settings,
  and nothing else. Never widen a policy to make a screen easier to build.
- `admin.html` carries `noindex,nofollow`.
- All values rendered from the database must be escaped before insertion.
  `settings` is attacker-controlled the moment an account is compromised.

---

## 8. Mobile

The dashboard is used from a phone, so:

- Sidebar becomes a horizontal scrolling tab strip.
- Row actions wrap to their own line; touch targets stay ≥44px.
- The image drop zone must accept a tap that opens the camera roll, not only
  drag and drop.
- Long-press to reorder is **not** required — the up/down buttons exist so
  reordering works without a drag gesture.
- Forms use a single column below 820px.

## 9. Accessibility

- Every field has a real `<label for>`.
- Errors are announced, not only coloured.
- The toast is `aria-live="polite"`.
- Focus is visible on every control — inherited from `styles.css`.
- Destructive actions are reachable and clearly named; "delete" never means
  "delete without asking".

---

## 10. Acceptance checklist

- [ ] Signing in with the wrong password shows one neutral message and keeps the email.
- [ ] Reloading while signed in does not ask for a password again.
- [ ] Creating an item with an image makes it appear on `/work` after publishing.
- [ ] An unpublished item is invisible to a signed-out visitor.
- [ ] Reordering in the dashboard reorders `/work`.
- [ ] Deleting an item removes its stored image too.
- [ ] Editing `copy.home.h1` changes the homepage headline with no deploy.
- [ ] Turning the assistant off removes the bubble site-wide.
- [ ] Publishing an announcement shows it once, and dismissing keeps it gone.
- [ ] Everything above works at 390px wide.
- [ ] With Supabase unreachable, the public site still renders from its HTML.

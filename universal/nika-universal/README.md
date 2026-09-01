# Nika Universal 1.4.3

Self-host Nika beside any website that can include a script tag. Your site data,
configuration, and rate-limit database stay on your server. AI requests go
directly from your server to the provider you select; Abatchan does not receive
the API key, prompts, or visitor conversations.

## Set up

1. Install Node.js 22.5 or newer, or Docker.
2. Copy `.env.example` to `.env`, `nika.config.example.json` to
   `nika.config.json`, and `content.example.json` to `content.json`.
3. Set a provider API key, your exact public website origin, and a long random
   hash secret in `.env`.
4. Describe only published pages in `content.json`.
5. Run `docker compose up -d --build`, or load `.env` through your host and run
   `npm start`.
6. Reverse-proxy `/nika/*` on your website to local port 8787.

Then open `/nika/admin` on the website and enter `NIKA_ADMIN_TOKEN`. This clean
settings page edits `nika.config.json`, so that file must be writable by the
Nika process. Provider, model, endpoint, and API key remain server-managed in
`.env`; the admin page reports their status but never receives the key. The
Generate and Draft buttons call the configured provider from the server and
return a clear setup error when the provider, key, model, or indexed content is missing.

Add this before the closing `</body>` tag:

```html
<script src="/nika/nika.js" defer></script>
```

The API key must stay in `.env`; never place it in HTML or `NikaConfig`.

For a static HTML site, Nika can discover new pages and changed content
automatically. Mount the site's published directory read-only, then set:

```env
NIKA_SITE_ROOT=/site
NIKA_AUTO_INDEX_SECONDS=60
```

The scanner reads only HTML, ignores forms, scripts, styles, navigation,
footers, SVG, hidden folders and `node_modules`, and caps every page plus the
overall prompt context. New or edited pages become available after the scan
interval without restarting Nika.

If Nika cannot access the site's files, generate `content.json` instead:

```sh
node index-static-site.mjs /path/to/site content.json --exclude=404.html,account/,private.html
```

Review the generated file before publishing it. Re-run the indexer after site
content changes, or replace it with your own CMS/export workflow.

## Customer controls

`nika.config.json` controls identity, the three pre-chat starter suggestions, owner instructions, excluded
paths, navigation/highlighting, microphone dictation and language, accent,
left/right position, context size, session-history length, visitor hourly budget,
whole-site daily budget, response temperature, and response-token budget (400 to 4000; 900 by default). Nika is instructed to finish each point cleanly and omit lower-priority detail rather than end mid-answer.

Testing and demo connections may be added under **Connections not counted** in the
admin page. They skip both request limits. `NIKA_EXEMPT_IPS` can set permanent
server-managed exemptions that the browser admin cannot remove.

Nika captures the live route, title, main heading, visible section and rendered
page text again for every question. This works for newly deployed pages before
the next static index refresh, SPA route changes, open dialogs, tabs and expanded
details. It also creates a compact local target registry from headings, cards,
buttons, links, fields, accessible labels and open shadow roots. Exact and compound
highlights use that registry without spending an AI request, and each target keeps
its own clickable fallback. Raw page HTML is never sent. Query parameters are never included in page context. Excluded paths are
also a runtime privacy boundary: the widget does not mount there and the server
rejects chat requests carrying one of those paths.

Conventional rendered HTML works automatically. Add `data-nika-target="Descriptive label"`
or `data-nika-label="Short alias"` to a custom component when it needs an explicit target name.
The older `data-assist-target` attribute remains supported. Closed shadow roots,
cross-origin iframe contents, canvas pixels and image-only text cannot be inspected
through the page DOM and require an owner-authored accessible target outside that boundary.

The supplied limits are starting examples. `hourlyLimit: 20` lets one visitor
make 20 requests before the hourly reset. `dailyLimit: 500` allows at most
15,000 requests in a 30-day month. `contextCharacters: 12000` is
roughly 2,000 words from the current screen, while `historyTurns: 10` keeps
about 10 recent question-and-answer exchanges.

Microphone dictation includes a live audio waveform, preserves text already in
the composer, inserts speech at the selected cursor position, and reconnects
short browser recognition sessions so longer notes are not cut off.

Request/body ceilings, server-only keys, exact-origin checks, published-route
validation, prompt-injection rules, and the read-only/no-form boundary are fixed
safeguards and cannot be disabled through customer configuration.

## Providers and privacy

Supported providers are OpenAI, DeepSeek, and HTTPS OpenAI-compatible chat
completion endpoints. Visible page context and recent in-session messages are
sent to the customer's configured provider when a visitor asks a question.
Review that provider's privacy terms and disclose this processing in the
website's privacy notice. Nika does not submit forms, make purchases, or access
visitor accounts.

`data/nika.db` stores hourly counts keyed by an HMAC hash of the connecting
address plus an aggregate whole-site daily count. Raw IP addresses are not
stored by Nika. Web-server or proxy logs are controlled separately by the
customer.

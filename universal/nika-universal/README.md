# Nika Universal 0.2.0

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

Add this before the closing `</body>` tag:

```html
<script>
  window.NikaConfig = {
    endpoint: "/nika",
    stylesheet: "/nika/nika-widget.css"
  };
</script>
<script src="/nika/nika-widget.js" defer></script>
```

The API key must stay in `.env`; never place it in HTML or `NikaConfig`.

For a static HTML site, generate the initial content file with:

```sh
node index-static-site.mjs /path/to/site content.json --exclude=404.html,account/,private.html
```

Review the generated file before publishing it. Re-run the indexer after site
content changes, or replace it with your own CMS/export workflow.

## Customer controls

`nika.config.json` controls identity, greeting, owner instructions, excluded
paths, navigation/highlighting, microphone dictation and language, accent,
left/right position, context size, session-history length, visitor hourly budget,
whole-site daily budget, response temperature, and response-token budget.

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

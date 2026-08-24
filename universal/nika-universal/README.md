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

## Providers and privacy

Supported providers are OpenAI, DeepSeek, and HTTPS OpenAI-compatible chat
completion endpoints. Visible page context and recent in-session messages are
sent to the customer's configured provider when a visitor asks a question.
Review that provider's privacy terms and disclose this processing in the
website's privacy notice. Nika does not submit forms, make purchases, or access
visitor accounts.

`data/nika.db` stores only hourly counts keyed by an HMAC hash of the connecting
address. Raw IP addresses are not stored by Nika. Web-server or proxy logs are
controlled separately by the customer.

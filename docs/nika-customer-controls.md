# Nika customer controls and fixed safeguards

## Determined by the customer

- AI provider, API key, model, and compatible HTTPS endpoint
- assistant name, greeting, input placeholder, accent colour, and left/right position
- owner instructions and the published content supplied to Nika
- paths excluded from knowledge and navigation
- whether approved navigation/highlighting is enabled
- whether browser microphone dictation is offered and its language
- visible-page context size and recent browser-session history length
- hourly per-visitor and whole-site daily request budgets
- hosting, database backups, provider billing, privacy notice, and log retention

The Universal adapter also exposes response temperature and maximum output tokens
in its customer-owned configuration file. WordPress keeps conservative response
defaults in version 0.2.x to avoid an overly technical admin screen.

## Fixed product safeguards

- provider keys remain server-side and are never returned in public config
- browser requests must come from the configured site origin
- navigation must be same-origin and match a published, non-excluded path
- request, prompt, context, history, page-count, and output ceilings remain bounded
- visible page text and visitor messages are always treated as untrusted content
- upstream/provider errors never expose secrets or raw provider responses
- Nika remains read-only: no automatic form submission, payment, account access,
  destructive action, or hidden visitor impersonation
- raw visitor IP addresses are not stored by Nika rate-limit databases

Safe ceilings can evolve between releases, but a customer setting must not be
allowed to bypass these boundaries. Site-count entitlements belong to the sales
licence/customer portal; they are not the same as AI usage budgets.

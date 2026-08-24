# Nika adapter contract

Every platform adapter serves the same browser widget and two same-origin JSON
endpoints. AI keys, database access, rate limits, and private instructions stay
on the customer's server.

## `GET {endpoint}/config`

```json
{
  "enabled": true,
  "name": "Nika",
  "greeting": "Hi. What can I help you find?",
  "placeholder": "Ask about this website...",
  "autoNavigate": true,
  "dictation": true,
  "dictationLanguage": "en-US",
  "accent": "#6366f1",
  "position": "right",
  "contextCharacters": 12000,
  "historyTurns": 10,
  "pages": [{ "path": "/", "title": "Home" }]
}
```

## `POST {endpoint}/chat`

Request:

```json
{
  "message": "Show me pricing",
  "history": [{ "role": "user", "content": "Show me pricing" }],
  "page": {
    "url": "https://example.com/",
    "path": "/",
    "title": "Home",
    "headings": [{ "id": "pricing", "text": "Pricing" }],
    "text": "Visible page text, capped by the widget"
  }
}
```

Response without navigation:

```json
{ "message": "Plans start on the pricing page." }
```

Response with navigation:

```json
{
  "message": "I'll take you to pricing.",
  "action": {
    "href": "/pricing#plans",
    "label": "Pricing plans",
    "departure": "Opening pricing..."
  }
}
```

The adapter must validate every action against its own published page list.
The widget repeats that check and refuses cross-origin destinations.

Adapters may expose customer preferences in public config, but never provider
keys, owner instructions, curated page text, raw visitor identifiers, internal
budgets, or provider error details.

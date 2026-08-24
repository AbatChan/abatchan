# Adding the guide to a site

One line, at the end of `<body>`:

```html
<script src="https://abatchan.com/embed.js" data-site="YOUR_SITE_KEY" async></script>
```

Nothing else is hosted by the site owner. The styles, the panel and the widget
are all fetched from the same place the script came from, so there is no second
URL to configure and no build step.

## WordPress

Use the installable connector in `wordpress/dist/` rather than editing theme
files. In WordPress, open Plugins > Add New > Upload Plugin, activate Nika Site
Guide, then open Settings > Nika Site Guide. Paste the tenant site key, test the
domain connection, and enable the guide. The connector is theme-independent.

## Before it will answer

Two things have to be true, and both are set on our side when the site is
onboarded:

**The site key must exist.** An unknown key is refused outright rather than
being served someone else's guide. If the key is wrong the console says so once
and nothing is painted.

**The domain must be authorised.** The key ships in the page source, so it is
public by design and secrecy is not what protects it. What protects it is the
origin list: a key lifted onto another domain is refused. Every domain the guide
should appear on has to be listed, including `www` if the site serves both, and
any staging domain.

The private record and onboarding procedure are documented in
[`tenant-store.md`](./tenant-store.md). Updating that stored record does not
require a site deployment; warm functions refresh it within one minute.

## Content Security Policy

A site with a CSP will block the guide until our origin is allowed. The three
directives that matter:

```
script-src  https://abatchan.com
connect-src https://abatchan.com
style-src   https://abatchan.com
```

If the CSP also restricts `img-src`, add it as well: the panel's icons and the
assistant's avatar load from the same origin.

Sites without a CSP need none of this.

## What the visitor's browser sends

Questions go to our API with the site key in a header. The request carries no
cookies and no credentials, and the guide holds no session, so it cannot act as
a signed-in visitor or read anything the page does not send it.

The first cross-origin request of a session is preceded by a browser preflight,
which is cached for a day, so it costs one extra round trip and not one per
question.

## Local development

`localhost` is not authorised by default. Ask for it to be added to the site's
origin list while building, and removed before launch.

## When it does not appear

Open the console. The guide reports one of:

- `no data-site on the embed script` — the `data-site` attribute is missing.
- `not enabled for this site (400)` — the key is not recognised.
- `not enabled for this site (403)` — the key is real, but this domain is not on
  its origin list.
- `could not reach the guide service` — network or CSP. Check `connect-src`.

Nothing is painted in any of these cases, which is deliberate: a guide that
appears and then fails on the first question is worse than one that never
appears.

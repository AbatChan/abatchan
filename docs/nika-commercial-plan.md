# Nika commercial plan

Product decision recorded 24 August 2026.

## Product model

Nika is customer-hosted software, not a hosted AI subscription. The customer:

- buys a one-time site licence;
- selects the platform installer covered by the package;
- supplies and pays for their own AI provider key;
- hosts their WordPress database or Universal SQLite data;
- controls the published content Nika may use.

Abatchan supplies the software, updates, documentation, and support. It does not
proxy production prompts, store customer conversations, or resell model usage.

## Packages

| Package | One-time price | Sites | Platform entitlement |
|---|---:|---:|---|
| Personal | $99 | 1 | One selected available platform |
| Business | $199 | 5 | WordPress and Universal |
| Agency | $399 | 25 | All available installers and adapters released during the included update term |

Every package includes lifetime use of the purchased version and 12 months of
updates and support. Renewal is optional. The renewal price, grace rules, and
whether security-only fixes continue after expiry must be decided before paid
checkout opens. “Lifetime updates” must not be promised.

## Platform delivery

Available in the first release:

1. WordPress plugin: configuration and bounded published content come from the
   customer's WordPress installation. The customer's provider key remains in
   PHP or `wp-config.php`.
2. Universal Node/Docker: embeds into any website that can add a script and
   reverse-proxy `/nika/*`. Configuration/content files and an SQLite usage
   database remain on the customer's server.

Shopify is planned only after the first two adapters pass real-site tests.
Checkout must ask the Personal buyer to choose WordPress or Universal before
creating the entitlement. Business and Agency receive both available builds.

## Licensing

The WordPress plugin ships GPL-2.0-or-later. Do not depend on hiding its PHP
source as the enforcement mechanism. A paid entitlement may govern support,
updates, download access, permitted site count, and access to separately
licensed non-WordPress builds.

Use signed licence tokens or a customer portal for update entitlement and site
count convenience, but keep the installed assistant functional when the
licensing service is temporarily unavailable. Never put the customer's AI key
in Abatchan's licence service.

The Universal package needs a reviewed commercial EULA covering site count,
client work, redistribution, white-labelling, support, updates, refunds, and
termination. Because Abatchan owns the shared code, it can be distributed under
GPL terms in the WordPress build and separate commercial terms elsewhere, but
the exact dual-licensing language should be reviewed before sale.

## Checkout and download architecture

1. Product page sends package and chosen platform to a hosted checkout.
2. Verified payment webhook creates an order and entitlement server-side.
3. Customer portal shows only entitled, versioned artifacts.
4. Download URLs are short-lived signed links; ZIP files are never unlocked by
   a browser-only flag.
5. Licence activation records a hashed licence identifier, product/version,
   and normalized site origin. It never stores provider credentials.
6. Refund or chargeback disables future downloads/updates; it does not remotely
   damage the already installed site.

Before choosing a payment/merchant-of-record vendor, re-verify 2026 support for
Nigerian businesses, payouts, taxes, chargebacks, WordPress licensing, webhook
quality, customer portal, and fees using that vendor's official documentation.

## Promotion

- Lead with the live behavior: “It does not just answer. It takes the visitor
  to the exact page and highlights the useful section.”
- Make 15–30 second vertical demos comparing a generic answer with Nika's
  navigation and highlight.
- Publish separate landing sections for WordPress and Universal installation.
- Show the ownership story clearly: your API key, your server, your data.
- Recruit a small WordPress-agency beta and turn measured outcomes into case
  studies. Do not invent conversion uplift.
- Provide a two-minute installation video, security diagram, privacy template,
  changelog, demo site, and honest browser dictation compatibility note.

## Gates before paid launch

- Test WordPress on clean current and minimum-supported WordPress/PHP installs;
  run WordPress Plugin Check and test popular cache/security configurations.
- Test Universal behind a real HTTPS reverse proxy and Docker volume restart.
- Add a current-provider compatibility test for each advertised AI provider.
- Add secure checkout, verified webhooks, entitlements, signed downloads,
  licence/site management, receipts, refunds, and a customer portal.
- Complete EULA, privacy notice, refund policy, support policy, security contact,
  and provider data-processing disclosures.
- Add upgrade/rollback tests, release signing/checksums, backups, rate-limit
  guidance, logs/retention controls, and abuse/cost documentation.
- Test microphone dictation in supported browsers and label unsupported browsers;
  add a server transcription option only if customers explicitly want the extra
  provider processing and cost.

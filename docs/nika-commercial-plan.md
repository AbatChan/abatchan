# Nika commercial plan

Current recommendation as of 24 August 2026.

## Business model

Nika should be sold as a hosted subscription, not a one-time or lifetime AI
plugin. The WordPress plugin is a GPL connector. The durable commercial value
stays in Nika's hosted service: tenant accounts, private website context, origin
binding, model access, metered usage, updates, analytics, and support.

This is the clean fit with WordPress rules. WordPress considers plugins and
themes derivative works under GPL, and the official directory requires all
plugin files to be GPL-compatible. It permits paid SaaS when the external
service provides substantive functionality, is clearly documented, and does
not exist only to validate a license key.

Sources:

- https://wordpress.org/about/license/
- https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/
- https://developer.wordpress.org/plugins/wordpress-org/common-issues/

## Launch pricing

| Plan | Price | Initial scope |
|---|---:|---|
| Starter | $19/month or $190/year | 1 site, 300 to 500 AI conversations, context, navigation, highlights, WordPress connector |
| Growth | $49/month or $490/year | 3 sites, around 2,000 conversations, form preparation, analytics, remove branding |
| Agency | $99/month or $990/year | 10 sites, higher pooled usage, client controls, white-label, priority onboarding |

Keep an honest free service level or useful demo for WordPress.org distribution,
then charge for hosted capacity. Do not advertise unlimited usage. Sell setup or
content onboarding separately at $99 to $299 when a customer wants it done for
them. Annual pricing gives two months free.

The range is deliberately below broader competitors while Nika is entering the
market. Tidio currently starts at $24.17/month for Starter, $49.17/month for
Growth, and $32.50/month for 50 Lyro AI conversations. Validate competitor
pricing again before the public launch.

Source: https://www.tidio.com/pricing/

## Payments and licensing

Use Freemius first. Its WordPress plan is currently 4.7% base plus 2.3% for
WordPress features, about 7% before any separately disclosed charges. It
provides checkout, subscriptions, licensing, multi-site activations, updates,
tax handling, a customer portal, and an affiliate system. It can pay sellers by
PayPal, Payoneer, or bank wire using IBAN/SWIFT, which is practical for a
Nigeria-based company.

For Nika, licensing is an entitlement check on the hosted account, not an
attempt to hide the PHP connector. Bind each active site to its account and
approved origins, meter service usage on the server, and stop service when the
subscription or allowance ends. A copied plugin ZIP should remain harmless
without a valid tenant account.

Sources:

- https://freemius.com/help/documentation/getting-started/saas-vs-wordpress-pricing/
- https://freemius.com/wordpress/

## Distribution

1. Run a manual private beta on 10 real sites, including abatchan and at least
   one WordPress install.
2. Submit the useful GPL connector to WordPress.org for discovery. Its readme
   must keep the external-service and privacy disclosures.
3. Sell Nika subscriptions from `abatchan.com/nika` using the Freemius buy
   button or secure checkout link.
4. Add ThemeForest or direct-sale themes as separate products. Sell each theme
   one-time with 12 months of updates/support or annual renewal. Bundle only a
   limited Nika trial, never lifetime AI service.
5. Consider CodeCanyon only as an extra discovery channel. Consider Woo
   Marketplace after Nika has WooCommerce-specific product, cart, and order
   guidance; Woo currently pays vendors 70% of net product revenue.

Sources:

- https://developer.woocommerce.com/docs/woo-marketplace/getting-started/
- https://woocommerce.com/woo-vendor-agreement/

## Promotion

- Lead with the live behavior: “It does not just answer. It takes the visitor
  to the exact page and highlights the useful section.”
- Record 15 to 30 second vertical demos comparing a generic answer with Nika
  navigating and highlighting the result.
- Make niche landing pages for WordPress agencies, WooCommerce stores, service
  businesses, and booking websites.
- Publish a two-minute WordPress installation video and a real interactive demo
  on the Nika page.
- Give beta agencies a 20% to 30% first-year referral commission after the
  customer refund period.
- Turn measured beta outcomes into case studies. Track guidance completion,
  useful-answer ratings, contact-form starts, and conversions. Never invent an
  uplift before it is measured.

## Gates before public paid launch

- Test the connector inside a clean WordPress 7.1 install and run Plugin Check.
- Add Nika account signup, site onboarding, billing entitlement, plan limits,
  customer portal, cancellation, and usage display.
- Add content ingestion/sync controls rather than onboarding every tenant by
  editing a private record manually.
- Add terms, privacy disclosures, data retention controls, deletion, and DPA
  language for the hosted service.
- Replace browser-vendor speech recognition with a server transcription
  fallback if dictation must work consistently across browsers.
- Add operational monitoring, abuse controls, cost alerts, backups, and a clear
  support process.

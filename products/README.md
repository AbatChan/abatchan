# Nika product builds

Nika is sold as customer-hosted software. Customers supply their own AI provider
key and host their own WordPress database or Universal SQLite data. Abatchan
does not proxy production prompts or charge for model usage.

`catalog.json` is the single source of truth for packages, platform choices,
site limits, and artifact names. Checkout must grant only the artifacts covered
by the purchased package and selected platform.

Run `node scripts/build-nika-products.mjs` from the repository root to sync the
shared widget, verify the adapters, and create release ZIPs in `downloads/`.

The WordPress package is GPL-2.0-or-later. Code owned by Abatchan may be offered
under separate terms in non-WordPress packages. Commercial terms, activation
rules, refund terms, and renewal pricing still require a reviewed customer EULA
before paid launch.

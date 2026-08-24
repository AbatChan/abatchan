=== Nika Site Guide ===
Contributors: abatchan
Tags: ai assistant, site guide, navigation, customer support
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect a WordPress site to Nika, a context-aware guide that can answer, navigate, scroll, and highlight useful page content.

== Description ==

Nika Site Guide is the lightweight WordPress connector for the hosted Nika service.

After you save your Nika site key, the plugin loads the guide on public pages. Nika can use configured website context, guide a visitor to approved pages and sections, and highlight the destination. The AI service, tenant configuration, limits, and account management remain hosted by abatchan.

This plugin requires a Nika service account. A free service level may be available; paid plans provide additional usage and features.

= External service =

The plugin connects to https://abatchan.com to load the guide and generate responses. It may send the visitor's question, current page URL, recent guide conversation, and limited visible page context required to answer or guide the visitor. It does not send WordPress authentication cookies or administrator credentials.

The service is provided by ABATCHAN LTD. Terms: https://abatchan.com/terms and privacy policy: https://abatchan.com/privacy.

== Installation ==

1. Upload the plugin ZIP in Plugins > Add New > Upload Plugin.
2. Activate Nika Site Guide.
3. Open Settings > Nika Site Guide.
4. Paste the site key from your Nika account and save.
5. Run the connection test. If the domain is not approved, add it to the site in Nika.
6. Enable "Show Nika to visitors" and save.

== Frequently Asked Questions ==

= Is the site key a password? =

No. The site key appears in the public page source. Nika protects it by checking the approved domain on every configuration and chat request.

= Will it work with my theme or page builder? =

The connector is theme-independent and does not require Elementor, Gutenberg, or a specific theme. A restrictive Content Security Policy may need to allow scripts, styles, images, and connections from https://abatchan.com.

= Does the plugin include the AI service? =

The GPL plugin is the connector. AI processing, account settings, usage limits, and tenant context are provided by the hosted Nika service.

== Changelog ==

= 0.1.0 =
* Initial connector with site-key settings, domain connection test, enable control, and external-service disclosure.

=== Nika Site Guide ===
Contributors: abatchan
Tags: ai assistant, site guide, navigation, byok
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 0.5.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A self-hosted, context-aware website guide using your AI key and WordPress database.

== Description ==

Nika answers from configured instructions, published WordPress content, and limited visible context from the visitor's current page. When explicitly asked, it can navigate to a published page, scroll to a section, and highlight the destination.

This edition is bring-your-own-key software:

* Settings and website content remain in your WordPress database.
* Conversation history remains in the visitor's browser session.
* AI requests are sent directly from WordPress to your selected provider.
* The provider key is used only by server-side PHP and is never returned to visitors.
* No Abatchan account or hosted Nika database is required.

Supported providers are OpenAI, DeepSeek, and OpenAI-compatible chat-completions endpoints.

== Third-party services ==

Nika contacts only the AI provider selected and configured by the site owner. A request may contain the visitor's question, recent Nika conversation, owner instructions, the current page URL, and limited visible/published website content required to answer.

Provider terms and privacy policies:

* OpenAI: https://openai.com/policies/terms-of-use/ and https://openai.com/policies/privacy-policy/
* DeepSeek: https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html and https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html
* A custom compatible provider is governed by the URL and terms chosen by the site owner.

Site owners should update their own privacy notice before enabling Nika.

== Installation ==

1. Upload the ZIP in Plugins > Add New > Upload Plugin.
2. Activate Nika Site Guide.
3. Open the dedicated Nika menu in WordPress Admin.
4. Select a provider and model, then add your API key.
5. Add website-specific instructions, customize the three starter suggestions, and review the hourly limit.
6. Choose navigation, microphone, appearance, context/history, daily budget, and any excluded paths.
7. Enable Nika and test it while logged out.

For stronger key protection, define `NIKA_AI_API_KEY` in `wp-config.php` instead of storing it through WordPress Admin.

== Frequently Asked Questions ==

= Where is my data stored? =

Configuration is stored in the WordPress options table. Published content is read from WordPress when needed. Short conversation history is stored in the visitor's session storage and is cleared with that browser session.

Newly published or updated pages and posts are discovered automatically. Nika clears its bounded local content index whenever WordPress saves or deletes content. The live browser page is checked again for every question, including pages not yet present in the index. Excluded paths do not load Nika and are rejected by the chat endpoint, so their visible content is not sent for answers or navigation.

= Does Abatchan receive my API key or conversations? =

No. This self-hosted package does not call an Abatchan Nika service. WordPress sends AI requests directly to the provider selected by the site owner.

= Can Nika navigate anywhere? =

No. The server and browser both restrict navigation to published paths returned by this WordPress installation. Cross-origin and unpublished destinations are rejected.

= Does Nika submit forms? =

No. Version 0.2.0 is read-only and does not submit forms, access user accounts, or complete payments.

= Which limits can I control? =

The site owner controls the pre-chat starter suggestions, per-visitor hourly and whole-site daily request budgets, visible context size, recent session history, excluded routes, navigation, microphone dictation, language, assistant identity, colour, and position. Security ceilings, same-origin enforcement, server-only API keys, published-route validation, and the read-only boundary cannot be disabled.

== Changelog ==

= 0.5.0 =
* Retry suggestion generation differently so smaller models stop returning placeholders.

= 0.4.9 =
* Never accept placeholder text such as ellipses as a generated suggestion.
* Fill generated fields in one quick pass instead of one at a time.
* Show progress while generating and while saving.
* Draft website instructions from your published content.
* Let the visitor guide hug its content before a conversation starts.

= 0.4.8 =
* Accept the JSON shapes AI providers actually return when generating suggestions, and retry once.
* Give every settings control the same height.

= 0.4.7 =
* Actually hide fields that do not apply to the selected provider.
* Reset the model to the provider default when the provider changes.

= 0.4.6 =
* Explain a blocked clipboard and select the key instead of showing a browser error.

= 0.4.5 =
* Remember the provider model list so it is ready without asking again.
* Explain the reload control and warn when provider changes are unsaved.
* Show unsaved changes on the save bar.
* Mask the saved API key and let an administrator reveal or copy it.
* Hide the compatible endpoint and dictation language until they apply.

= 0.4.4 =
* Keep the Generate button compact and the model controls aligned on every screen.
* Actually apply the spacing between provider errors and the suggestion form.

= 0.4.3 =
* Choose the model from a list loaded from your AI provider, or type a custom one.
* Type generated starter suggestions into the form instead of replacing it instantly.
* Use a compact Generate button and give provider errors room from the form.

= 0.4.2 =
* Keep the save confirmation region in place until there is actually a message to show.

= 0.4.1 =
* Check for a new Nika release immediately when WordPress is asked to check again, instead of waiting up to six hours.

= 0.4.0 =
* Centre the Nika menu icon so it matches the spacing of every other WordPress menu item.
* Keep the save confirmation clear of the header buttons and dismiss it automatically.

= 0.3.10 =
* Match the Nika menu icon spacing to other WordPress menu items.
* Use a clear borderless save confirmation that stays above the page.
* Explain usage defaults with practical examples.
* Include the starter-suggestion generator and its success and error states.

= 0.3.9 =
* Generate fresh starter suggestions from published WordPress content.
* Show clear loading, success, missing-key, and provider-error states.
* Require review and saving before generated suggestions reach visitors.

= 0.3.8 =
* Keep the Nika menu logo correctly sized on every WordPress admin screen.
* Reduce the Nika settings header logo.

= 0.3.7 =
* Use the canonical transparent Abatchan symbol and size it to match other WordPress menu icons.
* Replace decorative labels and promotional copy with direct WordPress settings language.
* Remove decorative punctuation from the Nika admin interface.

= 0.3.6 =
* Redirect the legacy Settings URL to Nika's dedicated top-level admin workspace.
* Prevent unrelated plugin promotions and notices from breaking Nika's hero and spacing.
* Keep Nika's own save feedback visible in a dedicated status area.

= 0.3.5 =
* Add a dedicated Nika admin menu with a branded icon and a polished, responsive settings workspace.
* Add readiness checks and clearer grouping for identity, AI, guidance, budgets, and content boundaries.
* Add automatic WordPress update discovery for future Nika releases distributed by Abatchan.

= 0.3.4 =
* Reveal verified same-page highlights automatically on phones instead of leaving the full-height guide over the target.
* Refresh the customer download builds after viewport, navigation, dictation, and configurable starter-suggestion QA.

= 0.3.3 =
* Replace the obsolete opening greeting with three owner-editable starter suggestions.
* Keep the starter title and supporting text customer-owned in WordPress and Universal settings.

= 0.3.2 =
* Add an audio-reactive dictation waveform with cancel, stop, and duration controls.
* Preserve existing composer text and insert long dictation at the cursor position.
* Make the center viewport section authoritative and refuse redundant navigation to it.

= 0.3.1 =
* Improve live page and section awareness on newly published routes.
* Refuse ambiguous duplicate highlights instead of guessing.
* Report image, canvas, and iframe visibility limits honestly.
* Improve dictation toggling, transcript preservation, and microphone errors.

= 0.3.0 =
* Documented automatic discovery of newly published WordPress pages, posts, and updated content.
* Refreshed the customer package alongside Universal automatic static-site discovery.

= 0.2.0 =
* Converted the connector into a self-hosted BYOK product.
* Added local WordPress settings, published-content context, provider proxy, hashed rate limits, and validated navigation.
* Added customer-owned feature, appearance, context, route-exclusion, and site-budget controls.
* Added an isolated responsive widget with optional browser dictation.

= 0.1.0 =
* Initial hosted-service connector beta.

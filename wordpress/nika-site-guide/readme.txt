=== Nika Site Guide ===
Contributors: abatchan
Tags: ai chatbot, chatbot, ai assistant, customer support, live chat
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 1.4.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Answer visitor questions from your own pages, and take people straight to the one they need. Your AI key, your database, no monthly fee.

== Description ==

Most visitors will not read your whole site to find one answer. Nika sits in the corner of every page and answers them from what you have already published, in your words, and then offers to take them to the page that proves it.

It is the same guide that runs on abatchan.com. Not a cut-down copy of it: the plugin ships those exact files.

**What your visitors get**

* Answers drawn from your published pages and posts, plus whatever is on screen right now.
* Replies that stream in as they are written, formatted with headings, lists and links.
* An offer to navigate, which waits for their approval unless they choose otherwise.
* Ordered multi-target guidance with a separate clickable link for every highlighted item.
* Local discovery of headings, cards, buttons, links, form fields and accessible labels before an AI request is needed.
* Dictation, so they can ask by voice.
* A conversation that survives moving between pages.

**What you control**

* The assistant's name, greeting, starter questions and the note under the message box.
* Colours: accent, panel and its opacity, both bubble gradient stops, scrollbar, shadow, text and icons. One click matches your theme's own palette.
* Your logo and bubble icon, at the size you choose, previewed on the surface they land on.
* Custom CSS for anything else. It loads inside the guide only and cannot affect the rest of your site.
* Per-visitor hourly and site-wide daily request budgets, IP exemptions for your own testing, and paths where Nika must never appear.
* A live preview on the settings page: the real guide, answering real questions, while the site stays hidden from visitors.

**Your key, your data, no subscription**

This is bring-your-own-key software. You pay your AI provider directly for what you use, and nothing to us after purchase.

* Settings and website content remain in your WordPress database.
* Conversation history remains in the visitor's browser session.
* AI requests are sent directly from WordPress to your selected provider.
* The provider key is used only by server-side PHP and is never returned to visitors.
* No Abatchan account or hosted Nika database is required.

Supported providers are OpenAI, DeepSeek, and OpenAI-compatible chat-completions endpoints.

**What Nika will not do**

It is read-only. It does not submit forms, sign in to accounts, take payments, or promise anything on your behalf, and it can only navigate to paths your own WordPress installation reports as published.

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

For highlighting, the browser builds a compact semantic target list from rendered labels, roles and accessible attributes. It does not send raw page HTML. Conventional theme and page-builder output works automatically; authors can add `data-nika-target="Descriptive label"` when a custom component needs an explicit name. The older `data-assist-target` attribute remains supported. Open shadow roots are indexed, while closed shadow roots, cross-origin frames, canvas pixels and image-only text remain outside browser DOM access.

= Does Abatchan receive my API key or conversations? =

No. This self-hosted package does not call an Abatchan Nika service. WordPress sends AI requests directly to the provider selected by the site owner.

= Can Nika navigate anywhere? =

No. The server and browser both restrict navigation to published paths returned by this WordPress installation. Cross-origin and unpublished destinations are rejected.

= Does Nika submit forms? =

No. Nika is read-only. It does not submit forms, access user accounts, or complete payments.

= Which limits can I control? =

The site owner controls the pre-chat starter suggestions, per-visitor hourly and whole-site daily request budgets, visible context size, recent session history, excluded routes, navigation, microphone dictation, language, assistant identity, every colour and size in the widget, the note under the message box, and custom CSS. Security ceilings, same-origin enforcement, server-only API keys, published-route validation, and the read-only boundary cannot be disabled.

== Changelog ==

= 1.4.7 =
* Follow the configured bubble shadow colour on hover as well, not only at rest.

= 1.4.6 =
* Keep the highlight's label under the chat panel instead of floating over it.

= 1.4.5 =
* Style the highlight's label on the page itself, so it is a positioned pill rather than unstyled text that pushed the layout around.

= 1.4.4 =
* Drop the separate link colour setting: links follow the accent, so it was one more field saying the same thing.

= 1.4.3 =
* Restore the note under the message box to its intended spacing, which 1.4.2's own margin reset had flattened.

= 1.4.2 =
* Add a link colour setting so links inside answers follow your palette instead of the built-in indigo.
* Colour the highlight's close control from the configured accent like every other guide surface.
* Pin the guide's own margins so a theme or browser default cannot shift its chrome.
* Prefer the content a navigation or footer label points at, rather than the menu entry that repeats it.

= 1.4.1 =
* Preserve complete navigation details so destination-page highlights run after a visitor clicks a saved action link.
* Trust verified anchors, wait for dynamically rendered targets, and build the resolver from each site's live accessible DOM instead of customer-specific selector maps.
* Support portable `data-nika-target` and `data-nika-label` labels for ambiguous custom components.
* Rank targets by the kind of thing named in the request, so "the Business package" highlights the whole card instead of its buy button.
* Dim the rest of the page while a highlight is up, so the answer reads as the answer.
* Repaint the highlight ring in real time when the site switches between light and dark.
* Let the visitor dismiss a highlight early with a close control, the Escape key, or a press on the page.
* Draw the highlight ring in the brand accent, thinner, and inside anything that clips its overflow.

= 1.4.0 =
* Use a clean rounded highlight outline without an added glow shadow.
* Style section labels as compact pills using the saved accent colour.

= 1.3.9 =
* Prefer exact targets in the main page content over duplicate navigation and footer labels.

= 1.3.8 =
* Highlight visible package cards, exact prices, and complete content sections without altering heading text.
* Keep highlight rings visible against the surrounding surface and remove internal route language from conversation history.

= 1.3.7 =
* Keep a named destination before the word highlight from being mistaken for the requested target in compound navigation.

= 1.3.6 =
* Include the footer root itself in semantic target discovery so same-page footer guidance can be verified and painted.

= 1.3.5 =
* Register page footers as guide targets and preserve highlighted targets during cross-page navigation, including relative pricing requests.

= 1.3.4 =
* Keep the adaptive ring visible against theme-important button styles and avoid duplicating labels over compact controls.

= 1.3.3 =
* Paint an adaptive high-contrast ring and badge around highlighted targets, and collapse nested semantic labels into one control.

= 1.3.2 =
* Require guided targets to remain in the accessible top page document and show a verified failure message whenever a requested element cannot actually be painted.

= 1.3.1 =
* Discard stale target references after third-party scripts move controls into an opaque iframe, preventing false found and highlighted results.

= 1.3.0 =
* Never substitute a broad page container when an exact inaccessible target was requested; report the target as unavailable instead of claiming a false highlight.

= 1.2.9 =
* Discover and highlight controls inside accessible same-origin or srcdoc iframes while preserving browser security boundaries for cross-origin frames.

= 1.2.8 =
* Prefer specific accessible field hints such as aria-labels and placeholders so hard form controls highlight exactly instead of falling back to a broad container.

= 1.2.7 =
* Give the browser the current WordPress site's published route allowlist so safe cross-page navigation works beyond Abatchan's own routes.

= 1.2.6 =
* Resolve explicit published-page navigation locally so Ask First always presents Continue and Not now instead of relying on an AI tool call.

= 1.2.5 =
* Add an individual clickable fallback for every target in a compound highlight.
* Discover buttons, links, fields, accessible labels, cards, and open shadow-root content locally before using AI.
* Bring deterministic exact and compound highlights to the Universal edition.

= 1.2.4 =
* Highlight multiple requested targets in order while preserving Ask First approval.

= 1.2.3 =
* Use a compact 22px minimum height for error action buttons.

= 1.2.2 =
* Keep exact local navigation and highlighting available without spending the AI request budget.

= 1.2.1 =
* Keep words in the highlight target from overriding the explicitly named destination page.

= 1.2.0 =
* Validate cross-page targets against the complete named WordPress page, including Elementor data.

= 1.1.9 =
* Honor an explicitly named published page when a cross-page highlight is requested.

= 1.1.8 =
* Align the WordPress live-target contract with the browser so exact heading highlights resolve reliably.

= 1.1.7 =
* Resolve exact live headings without waiting on a provider tool call and preserve cross-page highlight intent.

= 1.1.6 =
* Highlight an explicitly requested target even when it is already visible.

= 1.1.5 =
* Reliably resolve relative element requests such as highlighting the cheapest published price.

= 1.1.4 =
* Scroll to and highlight published headings or price elements even when the page has no authored anchor.

= 1.1.3 =
* Preserve requested section guidance, use a compact journey row, and prevent action copy from flashing before it is verified.

= 1.1.2 =
* Keep streamed replies as reader-friendly prose, even if an AI provider returns its JSON envelope.

= 1.1.1 =
* Restore the Ask first, Allow site actions, Concise, and Detailed menus in isolated installs.

= 1.1.0 =
* Keep Delete chat hidden whenever the visible conversation is empty.

= 1.0.9 =
* Restore the chat when attachments are intentionally unavailable, and keep Delete chat hidden until a conversation exists.

= 1.0.8 =
* Publish each release under a permanent download link as well as its version number.

= 1.0.7 =
* Stop an open section from clipping tooltips that reach past its edge.

= 1.0.6 =
* Rewrite the plugin description around what the guide does for a site owner.
* Hide the attachment control, which this edition does not yet read.

= 1.0.5 =
* Fix sections that collapsed only partly, leaving a tall empty card behind.
* Fix formatted answers: the markdown libraries were being loaded from the site root instead of from the plugin, so bold, lists and links were lost.
* Composer glyphs follow the CSS colour property, so custom rules and hover states tint them.
* Sections open themselves when a button inside them is used, and ease open with a smooth transition.
* Add a Custom CSS section for anything the settings do not cover. Your rules load inside the guide only.
* Collapse settings sections you are not using; the page remembers which.
* The IP check moved onto its field, with a shorter label and a tooltip.
* Your colour choices are used exactly as you set them. A hard-to-read combination is flagged with a one-click fix rather than being changed for you.
* Whatever colours you choose, the guide stays readable: text, icons, borders, menus and code blocks all follow your panel.
* A colour adjusted for contrast is shown back in the field that set it, so the box and the widget always agree.
* The composer icons now take the colour you choose, and the guide stays readable if you set a light panel.
* Answers reveal at a readable pace even when the provider sends them in bursts.
* Match the guide to your theme in one click, using the colour palette your theme already defines.
* Text and icon colours are editable, alongside the scrollbar and bubble shadow.
* Set the scrollbar and bubble shadow colours, and reset the whole appearance to a fresh install's look in one click.
* Answers now stream in as the provider writes them, instead of appearing whole and then retyping themselves.
* Fix the send and stop icons, which looked broken because the guide was loading them from the site root rather than from the plugin.

= 0.8.9 =
* Every appearance setting applies to the guide as you type it, including position and the bubble icon size.
* All settings controls line up at one height, and the opacity slider fills to its value.
* Set the panel colour and opacity, both bubble gradient colours, the header logo and bubble icon sizes, and the note under the message box.
* Preview each mark on the surface it lands on: the panel header, or the accent bubble itself.
* The preview now answers as the assistant you are configuring, before you save.

= 0.8.2 =
* Ship the guide from abatchan.com itself: the same shell, widget, stylesheet and icons the designed-for site runs, rather than a smaller copy of it.
* Adds streamed answers with a typing indicator, formatted replies, per-message feedback, and the site's own suggestion icons.
* The guide is isolated from the theme it lands in, so it renders the same on any site.
* Answers describe the page the visitor is actually on.

= 0.7.0 =
* Try Nika on the settings page itself: the real widget floats there and answers for administrators while the site stays hidden from visitors.
* Every setting applies to it as you type, with no save and no reload: name, placeholder, colour, position, logo, bubble icon and starter suggestions.
* Keep the accent hex beside the swatch in step with the picker.
* Show a transparency checkerboard behind the image previews so a white mark stays visible.

= 0.6.4 =
* Make the image picker button visible on the settings card.

= 0.6.3 =
* Choose your own header logo and bubble icon from the media library, or leave them empty to keep the bundled mark.

= 0.6.2 =
* Keep answering after the first question: a past reply is now replayed to the provider in the same JSON envelope it must produce, instead of leaving the second question unanswered.

= 0.6.1 =
* Recover the answer when a provider replies in an unexpected JSON shape or stops at the token ceiling, instead of dead-ending Detailed answers.
* Offer the navigation the model proposed even when it returned no prose with it.

= 0.6.0 =
* Send with Enter and start a new line with Shift+Enter, matching the canonical composer.
* Highlight the requested section after arrival when the server adds a trailing slash to the address.

= 0.5.9 =
* Match the canonical visitor composer across WordPress and Universal installs.
* Add Ask first, Allow actions, Concise, and Detailed modes.
* Keep conversations through approved cross-page navigation and retry late page-builder targets.
* Preserve compound current-page questions instead of dropping the second request.

= 0.5.8 =
* Match the polished Nika visitor design across WordPress and Universal installs.
* Let administrators exempt testing and demo connections from request limits.
* Keep permanent WordPress exemptions in NIKA_EXEMPT_IPS and generate Universal drafts without exposing the server key.

= 0.5.7 =
* Clear Nika's release cache before WordPress runs a forced plugin update check.

= 0.5.6 =
* Ask for shorter starter suggestions and shorten them at a readable boundary instead of mid-word.

= 0.5.5 =
* Fade the highlight on filled fields instead of leaving it stuck.

= 0.5.4 =
* Actually show the highlight on fields that were just filled in.

= 0.5.3 =
* Let the status strip carry the loading motion instead of spinning the button icon.
* Keep a highlight on fields that were just filled in.

= 0.5.2 =
* Stop offering an update to the version already installed.

= 0.5.1 =
* Serve the visitor guide stylesheet per version so upgrades are not hidden by a cached copy.

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

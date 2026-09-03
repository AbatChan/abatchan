import { readFileSync } from 'node:fs';

const build=readFileSync(new URL('../scripts/build-nika-products.mjs',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../products/catalog.json',import.meta.url),'utf8'));
const php=readFileSync(new URL('../wordpress/nika-site-guide/nika-site-guide.php',import.meta.url),'utf8');
const readme=readFileSync(new URL('../wordpress/nika-site-guide/readme.txt',import.meta.url),'utf8');
const widget=readFileSync(new URL('../wordpress/nika-site-guide/assets/assistant-v2.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../wordpress/nika-site-guide/assets/guide-shell.js',import.meta.url),'utf8');
const guideCss=readFileSync(new URL('../wordpress/nika-site-guide/assets/assistant.css',import.meta.url),'utf8');
const canonicalShell=readFileSync(new URL('../guide-shell.js',import.meta.url),'utf8');
const canonicalGuideCss=readFileSync(new URL('../assistant.css',import.meta.url),'utf8');
const adminCss=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-admin.css',import.meta.url),'utf8');
const adminJs=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-admin.js',import.meta.url),'utf8');
const adminIcon=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-admin-icon.png',import.meta.url));
const canonicalAdminIcon=readFileSync(new URL('../assets/abatchan-symbol-white-tight-504x308.png',import.meta.url));
const updateManifest=JSON.parse(readFileSync(new URL('../lib/licence/wordpress-release.json',import.meta.url),'utf8'));
const canonical=readFileSync(new URL('../assistant-v2.js',import.meta.url),'utf8');
const pluginVersion=(php.match(/const NIKA_VERSION = '([^']+)'/)||[])[1];
const adminPage=php.slice(php.indexOf('function nika_settings_page()'),php.indexOf('function nika_excluded_paths()'));

let failed=false;
const check=(label,value)=>{const pass=Boolean(value);console.log(`${pass?'PASS':'FAIL'}  ${label}`);if(!pass)failed=true;};

console.log('=== a field explains itself without a line under every input ===');
check('descriptive notes move behind a mark beside the label',php.includes('function nika_help( $text )')&&php.includes('class="nika-help"')&&php.includes("role=\"tooltip\""));
check('notes that change what is typed stay visible',php.includes("esc_html_e( 'One path per line.'")&&php.includes("esc_html_e( 'Only required for an OpenAI-compatible provider.'")&&php.includes('cannot\n * stop a mistake it is not on screen to prevent'));
check('the mark is a question, not a warning',php.includes('>?</span>')&&!php.includes('nika-help">!'));
check('it opens by click and by keyboard focus, hover only an accelerator',adminCss.includes('.nika-help:hover + .nika-help-note,')&&adminCss.includes('.nika-help:focus + .nika-help-note { display: block !important; }')&&adminJs.includes(".closest?.('.nika-help')"));
check('focus reveal lives in CSS, where a label cannot undo it',adminJs.includes('A <label> forwards focus to the control it wraps')&&adminJs.includes(".closest?.('.nika-help, .nika-help-note')"));
check('a click on the mark cannot toggle the field it describes',adminJs.includes('event.preventDefault();')&&adminJs.includes('event.stopPropagation();')&&adminJs.includes('a checkbox would toggle just'));
check('escape closes it and it is described to assistive tech',adminJs.includes("if (event.key === 'Escape') closeAll();")&&adminJs.includes("setAttribute('aria-describedby', note.id)")&&php.includes('aria-expanded="false"'));
check('the note is anchored to the mark, not the label row',php.includes("'<span class=\"nika-help-wrap\">'")&&adminCss.includes('.nika-help-wrap { position: relative; display: inline-flex; }')&&php.includes('landed on top'));
check('it opens above the mark so it never covers the input',adminCss.includes('bottom: calc(100% + 9px)')&&!adminCss.includes('top: calc(100% + 8px)')&&adminCss.includes('.nika-help-note::before')&&adminCss.includes('bottom: -4px'));
check('a narrow screen pins it inside the viewport',adminCss.includes('@media (max-width: 782px)')&&adminCss.includes('max-width: min(260px, 78vw)'));
check('the remaining descriptive notes moved behind the mark too',php.includes("nika_help( __( 'Example: 12,000 characters")&&php.includes("nika_help( __( 'Testing and demo IPs skip visitor limits."));
check('the exempt-IP actions sit under the field, not in its heading',php.indexOf('nika-field__actions')>php.indexOf('id="nika-exempt-ips"')&&adminCss.includes('.nika-exemptions .nika-field__actions { justify-content: flex-start;'));
check('the small mark still has a full touch target',adminCss.includes('.nika-help::after { content: ""; position: absolute; inset: -14px; }'));

console.log('=== a licence brings updates, and never gates the guide ===');
check('the key is a saved, sanitized setting',php.includes("'licence_key' => ''")&&php.includes("preg_replace( '/[^A-Za-z0-9\\-]/'")&&php.includes('const NIKA_LICENCE_API'));
check('an unreachable licence service keeps the last known state',php.includes('// Unreachable is not invalid. Keep whatever was last known, and say so.')&&php.includes("'degraded'")&&php.includes("HOUR_IN_SECONDS"));
check('over the site count is reported, never enforced',php.includes("'over-limit'")&&php.includes('Nika keeps working here'));
check('development installs are named as not counting',php.includes('does not use one of your sites')&&php.includes('Development and staging installs are not counted'));
check('no licence state can stop the guide rendering',!php.includes("nika_licence_state()['state'] !== 'valid'")&&php.includes('Nika runs with or without a key'));
check('a changed key is rechecked at once, not from cache',php.includes("add_action( 'update_option_' . NIKA_OPTION")&&php.includes('nika_licence_forget();'));

console.log('=== the dashboard controls every colour the guide paints ===');
check('links take the accent rather than a hard-coded colour',!php.includes('link_colour')&&!php.includes('linkColour'));

console.log('=== self-hosted WordPress adapter ===');
check('plugin is GPL licensed',php.includes('License:           GPL-2.0-or-later'));
check('supports BYOK providers',php.includes("'openai', 'deepseek', 'compatible'"));
check('uses a dedicated top-level WordPress admin menu',php.includes("add_menu_page(")&&!php.includes('add_options_page(')&&php.includes("'toplevel_page_nika-site-guide'"));
check('ships the canonical transparent white Abatchan admin icon',adminIcon.equals(canonicalAdminIcon));
check('ships a responsive branded settings workspace',adminCss.includes('.nika-hero')&&adminCss.includes('.nika-shell')&&adminCss.includes('@media (max-width: 782px)'));
check('offers automatic future WordPress update notices',php.includes('pre_set_site_transient_update_plugins')&&php.includes('NIKA_UPDATE_MANIFEST')&&php.includes("'plugins_api'"));
// The permanent link is now an endpoint rather than a file. A stable zip URL
// was what made the archive public: it worked for buyers and for everyone else.
check('a buyer is sent an endpoint, never a file',catalog.platforms.some(entry=>entry.artifact==='/api/download?edition=wordpress')&&!JSON.stringify(catalog).includes('/downloads/'));
check('the versioned release stays immutable',build.includes('Refusing to overwrite immutable release'));
check('update downloads are restricted to the trusted HTTPS host',php.includes("'https' !== ( $parts['scheme']")&&php.includes("'abatchan.com' !== strtolower"));
check('the served manifest matches the plugin version',Boolean(pluginVersion)&&updateManifest.version===pluginVersion);
// The release description carries no download address at all. The only URL that
// yields bytes is minted per licence by /api/update, and expires.
check('the manifest never carries a standing package URL',!('package' in updateManifest)&&!JSON.stringify(updateManifest).includes('.zip'));
check('a forced WordPress update check clears the release manifest before the scheduled plugin check',php.includes("add_action( 'admin_init'")&&php.includes("}, 1 );")&&php.includes("add_action( 'load-update-core.php'")&&php.includes("nika_forget_update_manifest")&&php.includes("delete_site_transient( 'nika_update_manifest_v2' )")&&php.includes("upgrader_process_complete"));
check('model is a select that can be filled from the provider model list',php.includes("'/admin/models'")&&php.includes('nika_models_response')&&php.includes('nika_provider_models_url')&&php.includes('<select class="code" id="nika-model"')&&adminJs.includes('modelsEndpoint')&&adminJs.includes('fillModels'));
check('a custom model can still be typed for compatible providers',php.includes('id="nika-model-custom"')&&php.includes('__custom__')&&adminJs.includes('syncCustomMode')&&adminJs.includes("modelCustom.setAttribute('name', fieldName)"));
check('the model list request requires an HTTPS compatible endpoint',php.includes("'https' !== ( $parts['scheme'] ?? '' ) || empty( $parts['host'] )"));
check('generated suggestions are typed in and respect reduced motion',adminJs.includes('typeInto')&&adminJs.includes('prefers-reduced-motion')&&adminJs.includes("classList.add('is-typing')")&&adminCss.includes('input.is-typing'));
check('the generator button is compact and carries an icon',php.includes('nika-generate__icon')&&adminCss.includes('.nika-generate__icon')&&adminCss.includes('min-height: 30px')&&adminCss.includes('font-size: 12px'));
check('provider errors are spaced away from the suggestion form',adminCss.includes('.nika-admin .nika-generator-status { display: none; margin: 26px 0 0;')&&adminCss.includes('align-self: flex-start'));
check('the model list is cached and the reload control forces a refresh',php.includes('nika_models_cache_key')&&php.includes('set_transient( nika_models_cache_key( $s ), $models, 12 * HOUR_IN_SECONDS )')&&php.includes('nika_cached_models( $s )')&&adminJs.includes('?refresh=1'));
check('changing provider, endpoint or key drops the cached model list',php.includes('nika_forget_models_cache')&&php.includes("$provider !== $old['provider'] || $endpoint !== $old['endpoint'] || $key !== $old['api_key']"));
check('the reload control explains itself and warns about unsaved provider changes',php.includes('data-tip=')&&adminCss.includes('.nika-tip::after')&&adminJs.includes('providerDirty')&&adminJs.includes('Save your provider changes first.'));
check('unsaved changes are reflected on the save bar',adminJs.includes('is-dirty')&&adminJs.includes('You have unsaved changes.')&&adminCss.includes('.nika-savebar.is-dirty'));
check('a blocked clipboard degrades to a selected key rather than a raw browser error',adminJs.includes('offerManualCopy')&&adminJs.includes('setSelectionRange')&&adminJs.includes('copy it with Ctrl or Cmd and C'));
check('the saved key is masked, revealable and copyable by an administrator',php.includes("'/admin/key'")&&php.includes('nika_reveal_key_response')&&php.includes('id="nika-key-reveal"')&&php.includes('id="nika-key-copy"')&&adminJs.includes('navigator.clipboard.writeText'));
check('a wp-config key is never posted back into the database',php.includes("'source' => 'wp-config'")&&adminJs.includes("data.source === 'wp-config'")&&adminJs.includes("keyInput.removeAttribute('name')"));
check('the key is still never exposed to visitors',!php.match(/nika_config_response[\s\S]{0,800}api_key/)&&php.includes("register_rest_route( 'nika/v1', '/admin/key'")&&php.match(/'\/admin\/key'[\s\S]{0,220}manage_options/));
check('a hidden conditional field is really hidden, not just flagged',adminCss.includes('.nika-admin [hidden] { display: none !important; }'));
check('switching provider resets the model to that provider default',php.includes("'defaultModels' => array(")&&adminJs.includes('defaultModels')&&adminJs.includes('Model reset to'));
check('fields that depend on another choice are hidden until it is made',php.includes('data-nika-when="provider" data-nika-equals="compatible"')&&php.includes('data-nika-when="dictation"')&&adminJs.includes('syncConditionals'));
check('suggestion parsing accepts the shapes models actually return',php.includes('nika_extract_suggestions')&&php.includes('nika_json_slice')&&php.includes("'suggestions', 'items', 'questions', 'starters', 'data', 'results'")&&php.includes("'label', 'title', 'question', 'name', 'heading'"));
check('the retry differs from the first attempt instead of repeating it',php.includes('Example for an unrelated bicycle repair shop')&&php.includes("'compatible' !== $s['provider'] && ! $strict"));
check('a short suggestion reply is retried once before failing',php.includes('nika_request_suggestions( $s, $provider, $key, $content, true )')&&php.includes("'max_tokens' => 900"));
check('an incomplete generation says how many came back and from which model',php.includes('returned %2$d usable suggestions instead of three')&&php.includes("\$provider['model']"));
check('form controls share one height instead of selects standing taller',adminCss.includes('line-height: 1.4;')&&adminCss.includes('WordPress gives admin selects a 38px line-height'));
check('placeholder echoes are never accepted as suggestions',php.includes('nika_is_placeholder_text')&&php.includes('Never return placeholder text, ellipses')&&!php.includes('{\"label\":\"...\"'));
check('suggestion fields fill together instead of one after another',adminJs.includes('const TYPE_MS = 420')&&adminJs.includes('requestAnimationFrame')&&!adminJs.includes('index * 130'));
check('generating and saving both show they are working',adminJs.includes("submit.value = 'Saving...'")&&adminJs.includes('Saving your changes.')&&adminCss.includes('nika-sweep'));
check('the generate icon does not spin, the status strip carries the motion',!adminCss.includes('.nika-generate[aria-busy="true"] .nika-generate__icon')&&adminCss.includes('.nika-iconbutton[aria-busy="true"] svg'));
check('filled fields keep their highlight briefly',adminJs.includes("input.classList.add('is-filled')")&&adminJs.includes('2600')&&adminCss.includes('.nika-admin .nika-field input.is-filled')&&adminCss.includes('.nika-admin .nika-field input, .nika-admin .nika-field textarea { transition:'));
check('website instructions can be drafted from published content',php.includes("'/admin/instructions'")&&php.includes('nika_generate_instructions_response')&&php.includes('id="nika-generate-instructions"')&&adminJs.includes('instructionsEndpoint'));
check('replacing written instructions asks twice without a blocking dialog',adminJs.includes('Click Draft again to continue.')&&!adminJs.includes('window.confirm'));
check('the guide stylesheet is versioned so upgrades are not served from cache',php.includes("add_query_arg( 'ver', NIKA_VERSION, $base . '/assistant.css' )"));
check('the installed version comes from disk, not the constant in memory',php.includes("$transient->checked[ $plugin_file ] ?? NIKA_VERSION")&&php.includes('version_compare( $installed'));
check('an up to date install is cleared from the update list',php.includes('unset( $transient->response[ $plugin_file ] )')&&php.includes('$transient->no_update[ $plugin_file ]'));
check('suggestions are shortened at a readable boundary, never mid-word',php.includes('nika_clip_phrase')&&php.includes("nika_clip_phrase( $label, 90 )")&&php.includes("nika_clip_phrase( $description, 120 )")&&php.includes('at most 70 characters'));
check('menu icon stays bounded with a WordPress-sized label gap',php.includes("wp_add_inline_style(")&&php.includes("width:20px;height:20px")&&php.includes("margin:7px 0 0;")&&php.includes("object-fit:contain"));
check('save confirmation clears the header actions and dismisses itself',adminCss.includes('--wp-admin--admin-bar--height')&&adminCss.includes('.nika-feedback {')&&!adminCss.includes('.nika-feedback { position: fixed; z-index: 100100; top: 46px')&&adminJs.includes('setTimeout')&&adminJs.includes('feedback.remove()'));
check('admin copy avoids decorative AI-style punctuation',!adminPage.includes('—')&&!adminPage.match(/\b0[1-9]\s*[·:]/)&&!adminPage.includes('◈')&&!adminPage.includes('↗'));
check('legacy Settings links redirect to the standalone Nika workspace',php.includes("'options-general.php' !== $pagenow")&&php.includes("admin_url( 'admin.php?page=nika-site-guide' )"));
check('third-party notices cannot break the branded hero',adminCss.includes('.nika-hero__copy > .notice')&&adminCss.includes('#wpbody-content > .pms-cross-promo'));
check('API key stays in server PHP',php.includes("defined( 'NIKA_AI_API_KEY' )")&&php.includes("'Authorization' => 'Bearer ' . $key"));
check('API key is not returned by config',!php.match(/nika_config_response[\s\S]{0,800}api_key/));
check('visitor IP is hashed before storage',php.includes("hash_hmac( 'sha256', $ip")&&php.includes('set_transient( $key'));
check('testing connections can be exempted without exposing the list publicly',php.includes("'exempt_ips'")&&php.includes('nika_sanitize_exempt_ips')&&php.includes('NIKA_EXEMPT_IPS')&&php.includes("'/admin/ip'")&&php.includes('nika_client_ip()')&&adminJs.includes('nika-check-ip')&&adminJs.includes('nika-add-ip'));
check('customer controls visitor and site budgets',php.includes("'hourly_limit'")&&php.includes("'daily_limit'")&&php.includes("'site_daily'"));
check('customer controls features and appearance',php.includes("'navigation'")&&php.includes("'dictation'")&&php.includes("'accent'")&&php.includes("'position'"));
check('customer controls pre-chat starter suggestions',php.includes('nika_sanitize_suggestions')&&php.includes("'suggestions' => $s['suggestions']")&&!php.includes("'greeting' =>"));
check('admin can generate fresh suggestions from published content',php.includes("'/admin/suggestions'")&&php.includes('nika_generate_suggestions_response')&&php.includes('nika_site_index()')&&php.includes("'temperature' => $strict ? 0.4 : 0.9"));
check('suggestion generation requires administrator permission',php.includes("current_user_can( 'manage_options' )"));
check('suggestion generation reports missing keys and provider failures',php.includes('Add an AI API key before generating suggestions.')&&php.includes('Check the API key, model, and provider settings.'));
check('generated suggestions require review before saving',adminJs.includes('Review them, then save changes.')&&adminJs.includes("X-WP-Nonce")&&adminJs.includes("role', type === 'error' ? 'alert' : 'status'"));
check('save confirmation is custom, dismissible and borderless',php.includes("nika-feedback__message")&&!php.includes('settings_errors();')&&adminCss.includes('border: 0')&&adminJs.includes("dismissFeedback.addEventListener"));
check('usage limits include practical examples',adminPage.includes('20 questions before the hourly reset')&&adminPage.includes('15,000 requests in a 30-day month')&&adminPage.includes('roughly 2,000 words')&&adminPage.includes('10 recent question-and-answer exchanges'));
check('customer can exclude content and destinations',php.includes('function nika_excluded_paths')&&php.includes("'excluded_paths'"));
check('excluded paths suppress the widget and reject chat context',php.includes("'nika_excluded'")&&php.includes("if ( in_array( $current_path, nika_excluded_paths(), true ) ) return;"));
check('current-location answers use the live browser snapshot',php.includes('function nika_location_answer')&&php.includes('$direct_location = nika_location_answer'));
check('stale cross-page assistant replies are marked historical',php.includes('Historical reply from another page'));
check('visibility limitations and heading anchors reach the provider',php.includes('Visibility limitations:')&&php.includes('Available heading anchors:'));
check('concise and detailed responses have distinct complete-answer budgets',php.includes("'detailed' === $answer_depth")&&php.includes('up to 350 words')&&php.includes('normally under 120 words')&&php.includes("'max_tokens' => 'detailed' === $answer_depth ? 1400 : 700"));
check('foreign browser origins are rejected',php.includes('function nika_origin_allowed')&&php.includes("'nika_origin'")&&php.includes("'status' => 403"));
check('published WordPress content is locally indexed',php.includes('function nika_site_index()')&&php.includes('$post->post_content'));
check('content index is bounded and cached',php.includes('> 24000')&&php.includes("set_transient( 'nika_site_index_v1'"));
check('new and changed WordPress content invalidates the index',php.includes("add_action( 'save_post'")&&php.includes("add_action( 'deleted_post'"));
check('navigation is server allowlisted',php.includes("in_array( $path, wp_list_pluck( $pages, 'path' ), true )"));
check('cross-origin actions are rejected',php.includes("isset( $parts['host'] )"));
check('REST response hides provider details',php.includes("Nika could not reach the configured AI provider")&&!php.includes('wp_remote_retrieve_body( $response ) ) return new WP_Error'));
check('the packaged guide never reads an AI key in the browser',!/(api[_-]?key|authorization)\s*[:=]\s*['"`]/i.test(widget));
check('the guide is isolated from the theme it lands in',php.includes("'isolate' => true")&&shell.includes("host.style.cssText='all:initial")&&guideCss.includes(':host{color-scheme:dark;--ease:'));
check('a packaged install carries the design tokens the stylesheet reads',['--ink','--paper','--muted','--line','--edge','--signal','--signal-ink','--ease'].every(name=>guideCss.includes(`${name}:`)));
check('error action buttons use the compact requested minimum height',guideCss.includes('.assist-error-actions .btn{min-height:22px;'));
check('the provider stream is relayed as it arrives, not collected and replayed',php.includes('CURLOPT_WRITEFUNCTION')&&php.includes("'stream' => true")&&php.includes('ob_implicit_flush( true )')&&php.includes("header( 'X-Accel-Buffering: no' )"));
check('the relay is installed after every other option, so it is not reset',php.includes('curl_setopt( $curl, CURLOPT_WRITEFUNCTION, $relay );')&&!php.includes('CURLOPT_RETURNTRANSFER =>'));
check('nothing between the provider and the visitor may buffer the answer',php.includes("@ini_set( 'zlib.output_compression', 'Off' )")&&php.includes("header( 'Content-Encoding: none' )")&&php.includes('flush();'));
check('a split SSE line is carried into the next chunk',php.includes('$carry = array_pop( $lines );'));
check('a streamed turn is asked for prose, and navigation for a tool call',php.includes("'stream' === $mode")&&php.includes('Never wrap it in JSON or code fences')&&php.includes("'name' => 'navigate_site'"));
check('both routes prepare a turn the same way',php.includes('function nika_chat_prepare( WP_REST_Request $request, $mode')&&php.includes('$ready = nika_chat_prepare( $request );')&&php.includes("nika_chat_prepare( $request, 'stream' )"));
check('the markdown libraries load beside the guide, not at the site root',widget.includes("marked:assetUrl('/assets/vendor/marked-15.0.12.min.js')")&&widget.includes("purify:assetUrl('/assets/vendor/purify-3.4.7.min.js')")&&!widget.includes('${API_BASE}/assets/vendor'));
check('a glyph is tinted through the variable the setting uses',guideCss.includes('background-color:var(--assist-icon,currentColor)')&&php.includes('--assist-icon: #ff3b3b'));
check('a control inside a collapsed section opens it first',adminJs.includes("trigger.closest('.nika-card.is-collapsed')")&&adminJs.includes("card?.querySelector('.nika-card__toggle')?.click()"));
check('the guide finds its icons beside itself, not at the site root',widget.includes("const assetUrl=path=>`${ASSET_BASE}${path}`")&&(widget.match(/\/assets\/icons/g)||[]).length===(widget.match(/assetUrl\('\/assets\/icons/g)||[]).length&&php.includes("'assetBase' => $base"));
check('navigation cannot be forged by the page',php.includes("'X-Abatchan-Action-Token: ' . $token")&&php.includes('<!--abatchan-nav:{$token}:'));
check('the page the guide is on is read from the snapshot it sends',php.includes("is_array( $body['pageContext'] ?? null ) ? $body['pageContext']")&&php.includes("is_string( $body['page'] ?? null ) ) $page['path'] = $body['page']"));
check('the site\'s own palette can fill the guide colours',php.includes('function nika_theme_palette')&&php.includes("wp_get_global_settings( array( 'color', 'palette' ) )")&&php.includes("get_theme_support( 'editor-color-palette' )")&&adminJs.includes('#nika-match-theme'));
check('a matched accent is a colour, not the theme\'s black or white',adminJs.includes('saturation(entry.color) > 0.18')&&adminJs.includes('luminance(entry.color) < 0.88'));
check('a matched palette keeps text readable on the surface it lands on',adminJs.includes('luminance(ink) > luminance(surface) ? ink : lightest()'));
check('glyphs are painted, so an icon colour is possible at all',guideCss.includes('-webkit-mask:var(--icon-src) center/contain no-repeat')&&shell.includes("image.style.setProperty('--icon-src',url)")&&shell.includes("image.setAttribute('src',BLANK_PIXEL)")&&shell.includes('new MutationObserver(paintGlyphs)'));
check('the bubble glow takes the owner colour',guideCss.includes('var(--assist-launch-glow,rgba(79,70,229,.42))')&&php.includes("'shadow_colour' => sanitize_hex_color")&&shell.includes("set('--assist-launch-glow'"));
check('popovers and code blocks follow the panel, not a fixed dark surface',guideCss.includes('var(--assist-menu-bg,rgba(18,18,22,.97))')&&guideCss.includes('var(--assist-code-bg,rgba(0,0,0,.22))')&&shell.includes("set('--assist-menu-bg'"));
check('low contrast is flagged with a one-click fix, never applied silently',shell.includes('resolved.suggestedText=suggest(cfg.textColour)')&&adminJs.includes('This may be hard to read on your panel colour.')&&adminJs.includes('nika-field__contrast-fix')&&!adminJs.includes('Adjusted so it stays readable'));
check('a colour the owner typed is rendered exactly as typed',shell.includes("set('--paper',cfg.textColour||")&&shell.includes("set('--assist-icon',cfg.iconColour||")&&!shell.includes('const readable=colour=>'));
check('the scrollbar takes the owner colour',guideCss.includes('var(--assist-scrollbar,rgba(99,102,241,.56))')&&php.includes("'scrollbar_colour' => sanitize_hex_color")&&shell.includes("set('--assist-scrollbar'"));
check('owner CSS loads inside the guide only, and cannot close its own tag',php.includes('function nika_sanitize_custom_css')&&shell.includes("ownStyle.dataset.assistCustom='1'")&&shell.includes("(cfg.isolate?scope:document.head).append(ownStyle)")&&php.includes('id="nika-styles"'));
check('sections can be collapsed and are remembered per administrator',adminJs.includes("localStorage.getItem('nika.admin.closed')")&&adminJs.includes("card.classList.toggle('is-collapsed'")&&adminCss.includes('.nika-card.is-collapsed .nika-card__toggle svg'));
check('a jump from the section list opens it, then scrolls there smoothly',adminJs.includes("card.querySelector('.nika-card__toggle[aria-expanded=\"false\"]')?.click()")&&adminJs.includes("behavior: reducedMotion ? 'auto' : 'smooth'")&&adminCss.includes('.nika-card { scroll-margin-top: 48px; }'));
check('an open section never clips a tooltip that reaches past it',!adminCss.includes('.nika-card__inner { min-height: 0; overflow: hidden; }'));
check('a section eases open and collapses to nothing',adminCss.includes('.nika-card__body { display: grid; grid-template-rows: 1fr;')&&adminCss.includes('grid-template-rows: 0fr')&&adminCss.includes('.nika-card.is-collapsed .nika-card__inner { overflow: hidden; }')&&!adminCss.includes('.nika-card__inner { min-height: 0; overflow: hidden; }')&&adminJs.includes("inner.className = 'nika-card__inner'")&&adminJs.includes('body.append(inner);'));
check('a collapsed section leaves the tab order too',adminJs.includes('body.inert = !open;'));
check('the IP check sits on the field header with a short label',php.includes('id="nika-check-ip"')&&php.includes("esc_html_e( 'My IP'")&&php.includes('nika-field__head')&&!php.includes("esc_html_e( 'Check current IP'"));
check('the two appearance controls sit together, not spread apart',php.includes('<div class="nika-card__actions">')&&adminCss.includes('.nika-card__actions { display: flex; align-items: center; gap: 8px;'));
check('appearance can be reset to what a fresh install renders',php.includes('id="nika-reset-appearance"')&&php.includes('$defaults = nika_defaults();')&&adminJs.includes('resetAppearance.dataset.nikaDefaults'));
check('a reset never touches the provider, key or instructions',!php.includes("'api_key', 'instructions'")&&adminJs.includes('It only touches appearance'));
check('an owner can restyle the guide surface, gradient and mark sizes',['panel_colour','panel_opacity','gradient_from','gradient_to','logo_size','mark_size'].every(name=>php.includes(`'${name}' =>`)&&php.includes(`$input['${name}']`))&&guideCss.includes('var(--assist-panel-bg,')&&guideCss.includes('var(--assist-launch-from,')&&guideCss.includes('var(--assist-logo-size,')&&guideCss.includes('var(--assist-mark-size,'));
check('the visitor bubble follows the same gradient as the launcher',(guideCss.match(/var\(--assist-launch-from,/g)||[]).length===2);
check('the note under the message box is the owner\'s to write',php.includes('function nika_disclaimer')&&php.includes("[disclaimer]")&&shell.includes('note.textContent=cfg.disclaimer'));
check('the bubble is previewed even before an icon is chosen',adminCss.includes('.nika-image__preview.is-default-glyph::after')&&adminJs.includes("preview.classList.toggle('is-default-glyph'"));
check('renaming the assistant clears a transcript that introduced the old one',adminJs.includes("control.classList.contains('is-confirming')")&&adminJs.includes('control.click();'));
check('a mark is previewed on the surface it lands on, not a light tile',adminCss.includes('.nika-image__preview--panel')&&adminCss.includes('.nika-image__preview--launch')&&adminJs.includes('linear-gradient(150deg, ${from}, ${accent} 55%, ${to})'));
check('the widget position setting still moves the guide',guideCss.includes(':host(.assist-left) .assist-launch,:host(.assist-left) .assist-panel')&&shell.includes("element.classList.toggle('assist-left',cfg.position==='left')")&&adminJs.includes("position: value('position')"));
check('the bubble icon size also scales the default glyph',guideCss.includes('.assist-launch .chat{width:var(--assist-mark-size,24px)')&&!guideCss.includes('.assist-launch svg{width:var(--assist-mark-size'));
check('the slider is one 44px control, not a field boxed inside a field',adminCss.includes('.nika-field input:not([type="color"]):not([type="range"])')&&adminCss.includes('.nika-range { display: flex; align-items: center; gap: 12px; box-sizing: border-box; min-height: 44px; height: 44px;'));
check('the slider track fills to its value',adminCss.includes('var(--nika-fill, 50%)')&&adminJs.includes("opacity.style.setProperty('--nika-fill'"));
check('appearance settings reach the guide as tokens',shell.includes('const applyAppearance=element=>')&&shell.includes("set('--assist-panel-bg'"));
check('a preview answers as the assistant being configured, not the stored one',php.includes("current_user_can( 'manage_options' ) && is_array( $body['preview']")&&adminJs.includes('preview: { name: value(')&&widget.includes('...(EMBED.preview?{preview:EMBED.preview}:{})'));
check('a visitor cannot rename the assistant',php.includes("if ( current_user_can( 'manage_options' ) && is_array( $body['preview'] ?? null ) ) {"));
check('the guide reaches routes this plugin serves',php.includes("'/chat-stream'")&&php.includes("'/guide-feedback'")&&widget.includes('apiUrl(ROUTES.chat)'));
check('the guide is loaded from the plugin, not Abatchan',php.includes("plugin_dir_url( __FILE__ ) . 'assets'")&&!php.includes('abatchan.com/assistant')&&!php.includes('NIKA_SITE_GUIDE_SERVICE'));
check('ships the guide this site runs, byte for byte',widget===canonical&&shell===canonicalShell&&guideCss===canonicalGuideCss);
check('the logo and bubble icon are settings, not hardcoded',php.includes("'avatar' => nika_sanitize_image_url( $input['avatar'] ?? '' )")&&php.includes("'launcher_icon' => nika_sanitize_image_url( $input['launcher_icon'] ?? '' )")&&php.includes("'avatar' => $brand['avatar'], 'launcherIcon' => $brand['launcherIcon']"));
check('an owner image is restricted to http(s)',php.includes("esc_url_raw( trim( (string) wp_unslash( $value ) ), array( 'http', 'https' ) )"));
check('clearing the logo restores the bundled mark',php.includes("$s['avatar'] ?: plugin_dir_url( __FILE__ ) . 'assets/nika-admin-icon.png'"));
check('the settings page floats the real guide, not a mock',adminJs.includes('module.mountGuideShell(')&&adminJs.includes('isolate: true')&&php.includes("'shell' => add_query_arg")&&!php.includes('nika-widget.js'));
check('the preview reaches routes a visitor cannot use yet',adminJs.includes("headers: { 'X-WP-Nonce': window.NikaAdmin.nonce }")&&adminJs.includes('/chat-stream'));
check('an administrator can test answers while the site stays hidden',php.includes("if ( ! $s['enabled'] && ! current_user_can( 'manage_options' ) ) return new WP_Error( 'nika_disabled'"));
check('every colour readout follows its picker',adminJs.includes("'gradient_to', 'scrollbar_colour'")&&adminJs.includes('label.textContent = picker.value.toUpperCase()'));
check('a live edit reaches the composer the widget swapped in',shell.includes("panel.querySelector('textarea')")&&shell.includes("panel.querySelector('.assist-note')"));
check('an edit applies to the live guide rather than rebuilding it',adminJs.includes('guide.update(previewSettings()); return showResolved();'));
check('the image picker button is legible on a white card',!php.includes('nika-button--ghost nika-image__choose')&&adminCss.includes('.nika-image__choose { flex: 0 0 auto; align-self: stretch; padding: 0 14px; color: var(--nika-indigo-dark); background: #f1f1ff;'));
check('the media library is loaded for the picker',php.includes('wp_enqueue_media();')&&adminJs.includes('window.wp.media'));
check('no control is shown for something the adapter cannot do',shell.includes('cfg.attachments===false')&&php.includes("'attachments' => false")&&!readme.slice(0, readme.indexOf('== Changelog ==')).includes('attach'));
check('attachment-free installs still initialize the chat',widget.includes('if(addFile&&fileInput){')&&widget.includes('addFile.addEventListener'));
check('delete chat follows the visible conversation state',widget.includes("const syncClearVisibility=()=>{clear.hidden=panel.classList.contains('is-empty')}")&&widget.includes("panel.classList.remove('is-empty');syncClearVisibility();"));
check('composer choices survive clicks inside the isolated guide',widget.includes("event.composedPath().some(node=>node?.classList?.contains('assist-composer-menu-wrap'))"));
check('stream history stays prose so it cannot train the provider to leak JSON',php.includes("$json_mode = 'json' === $mode && 'compatible' !== $s['provider'];"));
check('a provider JSON envelope is never shown to a visitor',widget.includes('const readAnswerEnvelope=text=>')&&widget.includes('answer=readAnswerEnvelope(rawAnswer);')&&widget.includes('paintedFrames===0||answer!==rawAnswer'));
check('a requested section survives the WordPress navigation protocol',php.includes("'section_requested' => ! empty( $parsed['section_requested'] )")&&php.includes("'section_requested' => array( 'type' => 'boolean'"));
check('unanchored published headings are actionable instead of refused',php.includes('A named target does not need an authored URL anchor')&&php.includes('use its page route without inventing a fragment')&&php.includes("'arrival', 'section_requested'"));
check('relative price highlights resolve to a real nearby page target',php.includes('For a relative request such as cheapest price')&&php.includes('exact nearby heading or card label')&&php.includes('heading, price, card, or field'));
check('short currency prices remain exact local targets',php.includes('$is_price = (bool) preg_match')&&php.includes("strlen( $normalized_candidate ) < 3 && ! $is_price"));
check('a package name used as context is not treated as a second highlight',php.includes('names one target and one container')&&php.includes("(int) $match['position'] < $context_at"));
check('an already-visible target can still be explicitly highlighted',php.includes('An explicit highlight request still calls the tool when the target is already visible')&&php.includes('browser must paint the highlight'));
check('an exact live heading highlight does not depend on provider reliability',php.includes('function nika_direct_highlight_action')&&php.includes("isset( $ready['direct_action'] )")&&php.includes("'section_requested' => true"));
check('WordPress reads the live-target field the browser actually sends',php.includes("is_array( $page['sections'] ?? null ) ? $page['sections']")&&php.includes("$item['text'] ?? ( $item['label'] ?? '' )"));
check('a named published page wins over a model route guess',php.includes("$best_path = $published_path")&&php.includes("url_to_postid( home_url( $best_path ) )")&&php.includes("get_post_meta( $post_id, '_elementor_data', true )")&&php.includes("strpos( $normalize( $published_target_text ), $normalize( $candidate )")&&php.includes("basename( $published_path )"));
check('target words cannot masquerade as the requested page',php.includes("$route_context = false === $highlight_at")&&php.includes("strpos( $route_context, $route_name )"));
check('local guide actions do not spend the AI request budget',php.indexOf('$direct_highlight = nika_direct_highlight_action')<php.indexOf('$limited = nika_rate_allowed'));
check('compound highlight requests preserve every verified target in visitor order',php.includes("'steps' => $steps")&&php.includes("implode( ', then ', $labels )")&&php.includes("preg_match( '/\\bcheapest\\s+(?:option|price|plan)\\b/i")&&widget.includes('const sequence=Array.isArray(journey.steps)')&&widget.includes('setTimeout(runNext,900)')&&widget.includes('Highlighted ${sequence.length} targets in order.'));
check('nested semantic labels collapse to the single longest requested control',php.includes('$match_end = (int) $match[\'position\'] + (int) $match[\'length\']')&&php.includes('$match_end <= $kept_end'));
check('each compound target keeps its own clickable fallback',widget.includes("journey.steps:[journey]")&&widget.includes('destinations.forEach(destination=>')&&widget.includes('Open ${label}'));
check('hard controls are found from compact local semantics instead of HTML',widget.includes('automaticTargetNodes')&&widget.includes('input:not([type="hidden"])')&&widget.includes('kind:targetKind(node)')&&!widget.includes('outerHTML'));
check('cross-page highlight commands preserve target intent',php.includes("preg_match( '/\\bhighlight\\b/i', $ready['message'] ?? '' )"));
check('an empty explicit guide turn gets one constrained retry',php.includes('function nika_explicit_guide_request')&&php.includes("nika_explicit_guide_request( $ready['message'] ?? '' )")&&php.includes("$retry_payload['stream'] = false")&&php.includes("$retry_payload['tool_choice'] = array")&&php.includes("'name' => 'navigate_site'"));
check('explicit published-page navigation resolves locally before rate limiting',php.includes('function nika_direct_navigation_action(')&&php.indexOf('$direct_navigation =')<php.indexOf('$limited = nika_rate_allowed'));
check('footer movement resolves locally as a same-page highlighted target',php.includes("false !== strpos( $normalized_message, 'footer' )")&&php.includes("'label' => 'Footer'")&&php.includes("'section_requested' => true"));
check('cross-page navigation preserves an explicit highlight clause',php.includes('$highlight_label =')&&php.includes("'section_requested' => (bool) $highlight_label")&&php.includes('and highlighting %2$s'));
check('the route named before highlight cannot masquerade as the target',php.includes('$target_message = false === $highlight_position')&&php.includes('strpos( $target_message, $normalized_candidate )'));
check('the browser receives this WordPress site published route allowlist',php.includes("'paths' => wp_list_pluck( $published_pages, 'path' )"));
check('the listing leads with what an owner gets, not how it is built',readme.includes('Answer visitor questions from your own pages')&&readme.includes('**What your visitors get**')&&readme.includes('**What you control**')&&php.includes('Answers visitor questions from your published pages'));
check('the listing is findable by what people search for',readme.includes('Tags: ai chatbot, chatbot, ai assistant, customer support, live chat')&&!readme.includes('byok'));
check('the read-only boundary is still stated plainly',readme.includes('It is read-only. It does not submit forms')&&!readme.includes('Version 0.2.0 is read-only'));
check('external AI services are disclosed',readme.includes('== Third-party services ==')&&readme.includes('OpenAI:')&&readme.includes('DeepSeek:'));
check('readme promises no form submission',readme.includes('does not submit forms'));
check('readme distinguishes controls from safeguards',readme.includes('Which limits can I control?')&&readme.includes('cannot be disabled'));

console.log('\n=== a package withholds a convenience, never the product ===');
const adminScript=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-admin.js',import.meta.url),'utf8');
const adminStyles=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-admin.css',import.meta.url),'utf8');

check('one table names what each package includes',php.includes('function nika_packages()')&&php.includes("'business' => array( 'theme_match'")&&php.includes("'agency'   => array( 'white_label'"));
check('packages are cumulative, so Business keeps everything Personal had',php.includes('$granted = array_merge( $granted, $capabilities );')&&php.includes('if ( $package === nika_tier() ) break;'));
// The whole point of the licence design is that it cannot switch anything off.
// If a capability ever guards answering, navigation or highlighting, that has
// stopped being true and this catches it.
check('no capability guards the guide itself',!/nika_can\(\s*'(?:navigation|dictation|answers|highlight|chat)'/.test(php));
check('the guide runs the same on every package',php.includes('a package can withhold a convenience, never the product'));

console.log('\n=== a licence check that fails never takes a feature away ===');
check('an unreachable service keeps the last confirmed package',php.includes("if ( ! empty( $state['degraded'] ) || 'unreachable' === $status ) {")&&php.includes("return $known ?: 'personal';"));
check('being over the site count is not a downgrade',php.includes("if ( 'valid' !== $status && 'over-limit' !== $status ) $tier = 'personal';"));
check('the confirmed package is remembered outside the transient',php.includes("get_option( 'nika_confirmed_package'")&&php.includes("update_option( 'nika_confirmed_package'"));

console.log('\n=== the shortcut is gated, the destination stays open ===');
check('match site theme carries its package in the markup',php.includes("data-nika-capability=\"theme_match\"")&&php.includes("nika_capability_package( 'theme_match' )"));
check('a gated control is shown and explained, never hidden',adminScript.includes('const allowed = (control)')&&adminScript.includes("chip.className = 'nika-lock'")&&adminScript.includes('is included in')&&!adminScript.includes('matchTheme.hidden = true'));
check('the package is marked before the click, not after',adminScript.includes('allowed(matchTheme);\n    matchTheme.addEventListener'));
check('it still looks like a working button',adminStyles.includes('.nika-generate.is-locked')&&!adminStyles.includes('.nika-generate.is-locked { cursor: not-allowed'));
// Match site theme only fills in fields the owner can type into by hand. If it
// ever wrote something unreachable manually, gating it would gate the product.
check('every colour it sets has its own editable field',['accent','panel_colour','gradient_from','gradient_to','scrollbar_colour','shadow_colour','text_colour','icon_colour'].every(name=>php.includes(`[${name}]`)));
check('the licence card names the package in force',php.includes('$package = nika_package_name( strtolower(')&&php.includes('%1$s is active. Updates and support until %2$s.'));

console.log('\n=== the branding pair: present by default, removable by package ===');
const embed=readFileSync(new URL('../embed.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../universal/nika-universal/public/nika-loader.js',import.meta.url),'utf8');
const universalServer=readFileSync(new URL('../universal/nika-universal/server.mjs',import.meta.url),'utf8');

check('the guide carries a line naming the software',canonicalShell.includes("branding: true,")&&canonicalShell.includes("assist-brand")&&canonicalShell.includes("Powered by Nika"));
check('it is only omitted when branding is explicitly false',canonicalShell.includes("cfg.branding===false?''"));
// Every default in this chain has to fail towards branded. An old server, a
// truncated response or a config that predates the field must not produce a
// free unbranded guide.
check('both loaders treat a missing field as branded',embed.includes('branding: config.branding !== false')&&loader.includes('branding: config.branding !== false'));
check('the line survives a small screen',canonicalGuideCss.includes('.assist-brand{')&&!/@media[^{]*\{[^}]*\.assist-brand\{[^}]*display:\s*none/.test(canonicalGuideCss));
check('and states its own box model like the note above it',canonicalGuideCss.includes('.assist-brand{')&&canonicalGuideCss.includes('margin:0 0 8px!important'));

check('removing it is a package capability, not a free checkbox',php.includes("'branding' => nika_can( 'unbranded' ) ? ! empty( $input['branding'] ) : true,"));
// The form is not the boundary. A hidden input or a hand-made POST goes through
// sanitisation like everything else, which is where the capability is checked.
check('the capability is enforced on save, not in the form',php.includes('Enforced on save, not in the form'));
check('and again when the config is served',php.includes("'branding' => nika_can( 'unbranded' ) ? ! empty( $s['branding'] ) : true,"));
check('a lapsed package restores the line without losing the preference',php.includes("nika_can( 'unbranded' ) ? ! empty( $s['branding'] ) : true"));
check('the toggle is shown to every package and labelled with its own',php.includes("esc_html_e( 'Show the Nika line', 'nika-site-guide' )")&&php.includes("nika_capability_package( 'unbranded' )"));
check('the admin preview shows what a visitor sees',adminScript.includes("branding: capabilities.has('unbranded')")&&adminScript.includes("form.addEventListener('change', render);"));
// Universal reads a licence of its own now, so both editions answer the same
// question the same way. The detail lives in tests/nika-universal.test.mjs.
check('Universal gates the same capability rather than hard-coding an answer',universalServer.includes("branding: licence.can('unbranded') ? config.branding !== false : true")&&!universalServer.includes('NIKA_UNIVERSAL_BRANDING'));

console.log('\n=== a configuration moves between sites, secrets do not ===');
// The denylist is the whole safety story for export, so this reads the real
// defaults and asserts that anything named like a secret is on it. A new
// setting called something_key or provider_token fails here rather than in
// somebody's downloads folder.
const defaultsBlock=php.slice(php.indexOf('function nika_defaults()'),php.indexOf('function nika_settings()'));
const settingKeys=[...defaultsBlock.matchAll(/'([a-z_]+)'\s*=>/g)].map(match=>match[1]);
const privateBlock=php.slice(php.indexOf('function nika_private_keys()'),php.indexOf('function nika_export_document()'));
const privateKeys=[...privateBlock.matchAll(/'([a-z_]+)'/g)].map(match=>match[1]);
const secretish=settingKeys.filter(name=>/(^|_)(key|secret|token|password|credential)$/.test(name));
check('there are settings that look like secrets to protect',secretish.length>0);
check('and every one of them is excluded from an export',secretish.every(name=>privateKeys.includes(name)));
check('the licence key is excluded too, so an import cannot spend an activation',privateKeys.includes('licence_key')&&php.includes('spending one of the customer'));
check('the export strips them rather than listing what to keep',php.includes('array_diff_key( nika_settings(), array_flip( nika_private_keys() ) )'));

check('an import is sanitised on the same path as the form',php.includes('nika_sanitize_settings( $merged )'));
check('a file that is not an export is refused before anything is read',php.includes("'settings' !== ( $document['nika'] ?? '' )")&&php.includes('is not a Nika settings export'));
check('this site keeps the private keys it already had',php.includes('foreach ( nika_private_keys() as $private ) $merged[ $private ] = $current[ $private ];'));
// Two things that would otherwise break a site quietly rather than loudly.
check('images from the other site are dropped, never hotlinked',php.includes("foreach ( array( 'avatar', 'launcher_icon' ) as $image )")&&php.includes('hosted on the site the file came from'));
check('the guide is not switched on where there is no AI key',php.includes("if ( ! empty( $incoming['enabled'] ) && '' === trim( (string) $current['api_key'] ) )")&&php.includes('left switched off'));
check('every skipped field is reported, never silently dropped',php.includes("array( 'settings' => nika_sanitize_settings( $merged ), 'notes' =>")&&adminScript.includes('Array.isArray(result.notes)'));

check('both endpoints check the package, not just the WordPress role',php.includes("function nika_config_export_response()")&&php.includes("if ( ! nika_can( 'config_transfer' ) ) return nika_transfer_denied();")&&(php.match(/nika_can\( 'config_transfer' \) \) return nika_transfer_denied\(\);/g)||[]).length===2);
check('and administrators still cannot reach them without the capability',php.includes("current_user_can( 'manage_options' )")&&php.includes("register_rest_route( 'nika/v1', '/admin/config-export'")&&php.includes("register_rest_route( 'nika/v1', '/admin/config-import'"));
check('the refusal names the package instead of a slug',php.includes('Moving settings between sites is included in %s.'));
check('the controls are shown to every package and marked with theirs',php.includes("id=\"nika-export-config\" data-nika-capability=\"config_transfer\"")&&php.includes("id=\"nika-import-config\" data-nika-capability=\"config_transfer\""));
check('the page reloads after an import so the form cannot disagree with the database',adminScript.includes('window.location.reload()'));

console.log('\n=== a repeated request is answered, not deflected ===');
// The packaged editions build their own prompts, so guidance that only exists in
// the abatchan role leaves a customer's install behaving worse than the demo.
const guidance='Every visitor message is a live request';
const followUp='Resolve what a short follow-up refers to from the conversation';
check('the plugin tells the model a repeat is live work',php.includes(guidance)&&php.includes('never a reason to decline, defer, or reply that something was handled before'));
check('and how to resolve a short follow-up',php.includes(followUp)&&php.includes('set section_requested true'));
check('Universal carries the same two rules',universalServer.includes(guidance)&&universalServer.includes(followUp));

console.log('\n=== the questions the site could not answer ===');
// A visitor pressing "report a problem" is rare, so a report built only from
// thumbs is a report nobody reads. The signal that makes this useful is the one
// nobody has to send: the browser asked for a place and did not arrive.
check('the browser reports a verified miss on its own',canonical.includes('const reportUnresolved=(question,reason)=>')&&canonical.includes("verdict:'unresolved'"));
check('from the verified result, not the model\'s wording',canonical.includes("if(result&&result.outcome!=='completed'&&result.outcome!=='cancelled'){")&&canonical.includes("result.target_found===false?'section-missing'"));
// A report that carried who asked would be a different product with different
// obligations, and the privacy page would stop being true.
check('only the question and the reason travel',canonical.includes('No identity, no session, nothing')&&!/verdict:'unresolved'[^}]*(?:ip|session|visitor|id:)/.test(canonical));
check('a cancelled journey is not a failure',canonical.includes("result.outcome!=='cancelled'"));

check('both editions accept the signal',php.includes("'down', 'unresolved' ), true )")&&universalServer.includes("'down', 'unresolved'].includes(verdict)"));
check('and record why it was unresolved',php.includes("'reason' => sanitize_key(")&&universalServer.includes('reason: text(body?.reason, 40)'));

// Twenty people asking the same thing is one row with a count on it, because the
// count is what decides whether the page is worth writing.
check('questions are grouped, not listed one per visitor',php.includes('function nika_unanswered_questions(')&&php.includes('$grouped[ $key ][\'count\']++;')&&universalServer.includes('function unansweredQuestions('));
check('and ordered by how often they were asked',php.includes("$b['count'] === $a['count'] ? $b['last'] <=> $a['last'] : $b['count'] <=> $a['count']")&&universalServer.includes('b.count === a.count ? String(b.last).localeCompare(String(a.last)) : b.count - a.count'));
check('a visitor-reported one is marked as such',php.includes("$grouped[ $key ]['reported'] = true;")&&universalServer.includes('row.reported = true;'));

check('the report is a package feature, checked on the server',php.includes("nika_can( 'question_report' )")&&universalServer.includes("licence.can('question_report') ? unansweredQuestions() : null"));
// Empty and unavailable are different things and have to read differently: one
// says write nothing, the other says buy something.
check('an empty report is not confused with an excluded one',php.includes('Nothing yet. A question appears here')&&php.includes('See what visitors asked for and did not get'));
check('the list is rendered from the grouped rows',php.includes('nika-unanswered__list')&&php.includes("_n( 'asked %d time', 'asked %d times'"));

if(failed)process.exit(1);
console.log('\nall passed');

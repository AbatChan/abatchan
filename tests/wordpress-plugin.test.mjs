import { readFileSync } from 'node:fs';

const php=readFileSync(new URL('../wordpress/nika-site-guide/nika-site-guide.php',import.meta.url),'utf8');
const readme=readFileSync(new URL('../wordpress/nika-site-guide/readme.txt',import.meta.url),'utf8');
const widget=readFileSync(new URL('../wordpress/nika-site-guide/assets/nika-widget.js',import.meta.url),'utf8');
const canonical=readFileSync(new URL('../products/nika-core/nika-widget.js',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{const pass=Boolean(value);console.log(`${pass?'PASS':'FAIL'}  ${label}`);if(!pass)failed=true;};

console.log('=== self-hosted WordPress adapter ===');
check('plugin is GPL licensed',php.includes('License:           GPL-2.0-or-later'));
check('supports BYOK providers',php.includes("'openai', 'deepseek', 'compatible'"));
check('API key stays in server PHP',php.includes("defined( 'NIKA_AI_API_KEY' )")&&php.includes("'Authorization' => 'Bearer ' . $key"));
check('API key is not returned by config',!php.match(/nika_config_response[\s\S]{0,800}api_key/));
check('visitor IP is hashed before storage',php.includes("hash_hmac( 'sha256', $ip")&&php.includes('set_transient( $key'));
check('customer controls visitor and site budgets',php.includes("'hourly_limit'")&&php.includes("'daily_limit'")&&php.includes("'site_daily'"));
check('customer controls features and appearance',php.includes("'navigation'")&&php.includes("'dictation'")&&php.includes("'accent'")&&php.includes("'position'"));
check('customer controls pre-chat starter suggestions',php.includes('nika_sanitize_suggestions')&&php.includes("'suggestions' => $s['suggestions']")&&!php.includes("'greeting' =>"));
check('customer can exclude content and destinations',php.includes('function nika_excluded_paths')&&php.includes("'excluded_paths'"));
check('excluded paths suppress the widget and reject chat context',php.includes("'nika_excluded'")&&php.includes("if ( in_array( $current_path, nika_excluded_paths(), true ) ) return;"));
check('current-location answers use the live browser snapshot',php.includes('function nika_location_answer')&&php.includes('$direct_location = nika_location_answer'));
check('stale cross-page assistant replies are marked historical',php.includes('Historical reply from another page'));
check('visibility limitations and heading anchors reach the provider',php.includes('Visibility limitations:')&&php.includes('Available heading anchors:'));
check('foreign browser origins are rejected',php.includes('function nika_origin_allowed')&&php.includes("'nika_origin'")&&php.includes("'status' => 403"));
check('published WordPress content is locally indexed',php.includes('function nika_site_index()')&&php.includes('$post->post_content'));
check('content index is bounded and cached',php.includes('> 24000')&&php.includes("set_transient( 'nika_site_index_v1'"));
check('new and changed WordPress content invalidates the index',php.includes("add_action( 'save_post'")&&php.includes("add_action( 'deleted_post'"));
check('navigation is server allowlisted',php.includes("in_array( $path, wp_list_pluck( $pages, 'path' ), true )"));
check('cross-origin actions are rejected',php.includes("isset( $parts['host'] )"));
check('REST response hides provider details',php.includes("Nika could not reach the configured AI provider")&&!php.includes('wp_remote_retrieve_body( $response ) ) return new WP_Error'));
check('widget is loaded from the plugin, not Abatchan',php.includes("plugin_dir_url( __FILE__ ) . 'assets/nika-widget.js'")&&!php.includes("NIKA_SITE_GUIDE_SERVICE"));
check('packaged widget matches shared core',widget===canonical);
check('external AI services are disclosed',readme.includes('== Third-party services ==')&&readme.includes('OpenAI:')&&readme.includes('DeepSeek:'));
check('readme promises no form submission',readme.includes('does not submit forms'));
check('readme distinguishes controls from safeguards',readme.includes('Which limits can I control?')&&readme.includes('cannot be disabled'));

if(failed)process.exit(1);
console.log('\nall passed');

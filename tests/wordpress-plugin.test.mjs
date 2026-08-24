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
check('foreign browser origins are rejected',php.includes('function nika_origin_allowed')&&php.includes("'nika_origin'")&&php.includes("'status' => 403"));
check('published WordPress content is locally indexed',php.includes('function nika_site_index()')&&php.includes('$post->post_content'));
check('content index is bounded and cached',php.includes('> 24000')&&php.includes("set_transient( 'nika_site_index_v1'"));
check('navigation is server allowlisted',php.includes("in_array( $path, wp_list_pluck( $pages, 'path' ), true )"));
check('cross-origin actions are rejected',php.includes("isset( $parts['host'] )"));
check('REST response hides provider details',php.includes("Nika could not reach the configured AI provider")&&!php.includes('wp_remote_retrieve_body( $response ) ) return new WP_Error'));
check('widget is loaded from the plugin, not Abatchan',php.includes("plugin_dir_url( __FILE__ ) . 'assets/nika-widget.js'")&&!php.includes("NIKA_SITE_GUIDE_SERVICE"));
check('packaged widget matches shared core',widget===canonical);
check('external AI services are disclosed',readme.includes('== Third-party services ==')&&readme.includes('OpenAI:')&&readme.includes('DeepSeek:'));
check('readme promises no form submission',readme.includes('does not submit forms'));

if(failed)process.exit(1);
console.log('\nall passed');

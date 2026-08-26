import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const root = new URL('../', import.meta.url);
const server = readFileSync(new URL('universal/nika-universal/server.mjs', root), 'utf8');
const env = readFileSync(new URL('universal/nika-universal/.env.example', root), 'utf8');
const readme = readFileSync(new URL('universal/nika-universal/README.md', root), 'utf8');
const coreJs = readFileSync(new URL('products/nika-core/nika-widget.js', root), 'utf8');
const coreCss = readFileSync(new URL('products/nika-core/nika-widget.css', root), 'utf8');
const widgetJs = readFileSync(new URL('universal/nika-universal/public/nika-widget.js', root), 'utf8');
const widgetCss = readFileSync(new URL('universal/nika-universal/public/nika-widget.css', root), 'utf8');

const checks = [
  ['uses customer environment API key', server.includes('process.env.NIKA_AI_API_KEY')],
  ['never exposes secrets or private instructions through config', server.includes('pages: directory') && !server.includes('instructions: config.instructions') && !server.includes('apiKey: API_KEY')],
  ['keeps curated page text out of public config', server.includes("pages.map(({ path, title }) => ({ path, title }))")],
  ['requires exact same origin for browser calls', server.includes("origin === ORIGIN")],
  ['requires HTTPS for custom providers', server.includes("NIKA_AI_ENDPOINT must use HTTPS")],
  ['hashes visitor addresses before SQLite', server.includes("createHmac('sha256', SECRET)")],
  ['customer controls visitor and site budgets', server.includes('config.hourlyLimit') && server.includes('config.dailyLimit') && server.includes('site_usage')],
  ['customer controls features and appearance', server.includes('config.navigation') && server.includes('config.dictation') && server.includes('config.accent') && server.includes('config.position')],
  ['customer controls pre-chat starter suggestions', server.includes('suggestions(config.suggestions)') && server.includes('suggestions: config.suggestions') && !server.includes('greeting: config.greeting')],
  ['customer can exclude pages', server.includes('config.excludedPaths') && server.includes('excluded.has(path)')],
  ['excluded pages are blocked before visible context reaches AI', server.includes("return send(res, 403, { error: 'Nika is not available on this excluded page.'")],
  ['current-location answers do not depend on model obedience', server.includes('currentLocationAnswer(message, current)')],
  ['stale replies are marked historical after a page change', server.includes('historicalContext(')],
  ['visibility limitations and heading anchors reach the model', server.includes('Visibility limitations:') && server.includes('Available heading anchors:')],
  ['can automatically discover new static pages and content', server.includes('process.env.NIKA_SITE_ROOT') && server.includes('indexStaticSite(SITE_ROOT') && readme.includes('without restarting Nika')],
  ['does not store raw visitor addresses', !server.includes('remote_addr') && !server.includes('remoteAddress TEXT')],
  ['caps request bodies', server.includes('size > 32_768')],
  ['caps visible context and site index', server.includes("text(current?.text, 10_000)") && server.includes("slice(0, 24_000)")],
  ['server validates navigation destinations', server.includes('validateAction') && server.includes('url.origin !== ORIGIN')],
  ['returns generic upstream errors', server.includes('configured AI provider rejected the request')],
  ['example contains no real secret', env.includes('replace-with-your-provider-key') && env.includes('replace-with-a-long-random-secret')],
  ['documents customer-owned data flow', readme.includes('Abatchan does not receive')],
  ['documents no form submission', readme.includes('does not submit forms')],
  ['packages canonical shared widget', widgetJs === coreJs && widgetCss === coreCss]
];

console.log('=== universal self-hosted adapter ===');
let failed = false;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  failed ||= !pass;
}
assert.equal(failed, false);
console.log('\nall passed');

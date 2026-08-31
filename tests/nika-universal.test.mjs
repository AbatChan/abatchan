import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const root = new URL('../', import.meta.url);
const server = readFileSync(new URL('universal/nika-universal/server.mjs', root), 'utf8');
const env = readFileSync(new URL('universal/nika-universal/.env.example', root), 'utf8');
const readme = readFileSync(new URL('universal/nika-universal/README.md', root), 'utf8');
const guideShell = readFileSync(new URL('guide-shell.js', root), 'utf8');
const guideWidget = readFileSync(new URL('assistant-v2.js', root), 'utf8');
const guideCss = readFileSync(new URL('assistant.css', root), 'utf8');
const packagedShell = readFileSync(new URL('universal/nika-universal/public/guide-shell.js', root), 'utf8');
const packagedWidget = readFileSync(new URL('universal/nika-universal/public/assistant-v2.js', root), 'utf8');
const packagedCss = readFileSync(new URL('universal/nika-universal/public/assistant.css', root), 'utf8');
const adminHtml = readFileSync(new URL('universal/nika-universal/public/admin.html', root), 'utf8');
const adminJs = readFileSync(new URL('universal/nika-universal/public/admin.js', root), 'utf8');

const checks = [
  ['uses customer environment API key', server.includes('process.env.NIKA_AI_API_KEY')],
  ['protects the browser admin with a server token', server.includes('NIKA_ADMIN_TOKEN') && server.includes('timingSafeEqual') && adminJs.includes('Authorization:`Bearer ${token}`')],
  ['keeps provider credentials server-managed in the universal admin', adminHtml.includes('Change provider credentials in') && adminHtml.includes('The browser never receives the saved API key') && !adminJs.includes('NIKA_AI_API_KEY')],
  ['supports connections that do not count in the universal admin', server.includes('exemptIps') && server.includes('ENV_EXEMPT_IPS') && adminHtml.includes('Connections not counted') && adminJs.includes('/nika/admin/ip')],
  ['generates admin drafts through the server without returning the key', server.includes("'/nika/admin/generate'") && server.includes('generateAdminDraft') && adminHtml.includes('Generate with AI') && adminJs.includes("generate('suggestions'") && !adminJs.includes('NIKA_AI_API_KEY')],
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
  ['exact and compound highlights resolve locally without AI tokens', server.includes('function directHighlightAction(') && server.indexOf('const directAction = config.navigation ? directHighlightAction') < server.indexOf('const limited = rateAllowed') && server.includes('steps\n  };')],
  ['short currency prices remain exact local targets', server.includes('const isPrice =') && server.includes('normalized.length < 3 && !isPrice')],
  ['a package name used as context is not treated as a second highlight', server.includes('const contextQualifier =') && server.includes('matches[index].position >= contextualStart')],
  ['nested semantic labels collapse to the longest requested control', server.includes('item.position + item.length <= kept.position + kept.length')],
  ['explicit published-page navigation resolves locally without AI tokens', server.includes('function directNavigationAction(') && server.includes('directHighlightAction(message, current, pages) || directNavigationAction(message, current, pages)') && server.indexOf('const directAction = config.navigation ?') < server.indexOf('const limited = rateAllowed')],
  ['footer and cross-page highlights retain their target intent', server.includes("normalizedMessage.includes('footer')") && server.includes('const highlightLabel =') && server.includes('section_requested: Boolean(highlightLabel)')],
  ['the route named before highlight cannot masquerade as the target', server.includes("const targetMessage = highlightPosition < 0") && server.includes('targetMessage.indexOf(normalized)')],
  ['reads the compact target field the shared browser actually sends', server.includes('Array.isArray(snapshot.sections)') && server.includes('item?.text ?? item?.label')],
  ['stale replies are marked historical after a page change', server.includes('historicalContext(')],
  ['visibility limitations and compact semantic targets reach the model', server.includes('Visibility limitations:') && server.includes('Available semantic targets:')],
  ['concise and detailed responses have distinct complete-answer budgets', server.includes("answerDepth === 'detailed'") && server.includes('up to 350 words') && server.includes('normally under 120 words') && server.includes('numberBetween(config.maxTokens, 400, 4000, 900)')],
  ['can automatically discover new static pages and content', server.includes('process.env.NIKA_SITE_ROOT') && server.includes('indexStaticSite(SITE_ROOT') && readme.includes('without restarting Nika')],
  ['does not store raw visitor addresses', !server.includes('remote_addr') && !server.includes('remoteAddress TEXT')],
  ['caps request bodies', server.includes('size > 32_768')],
  ['caps visible context and site index', server.includes("text(current?.text, 10_000)") && server.includes("slice(0, 24_000)")],
  ['server validates navigation destinations', server.includes('validateAction') && server.includes('url.origin !== ORIGIN')],
  ['returns generic upstream errors', server.includes('configured AI provider rejected the request')],
  ['example contains no real secret', env.includes('replace-with-your-provider-key') && env.includes('replace-with-a-long-random-secret')],
  ['documents customer-owned data flow', readme.includes('Abatchan does not receive')],
  ['documents no form submission', readme.includes('does not submit forms')],
  ['the logo and bubble icon are settings, not hardcoded', server.includes('avatar: imageUrl(input.avatar)') && server.includes('launcherIcon: imageUrl(input.launcherIcon)') && server.includes("avatar: config.avatar || '/nika/nika-logo.png', launcherIcon: config.launcherIcon") && adminHtml.includes('name="launcherIcon"') && adminHtml.includes('name="avatar"')],
  ['an owner image is restricted to http(s) or this install', server.includes('function imageUrl(') && server.includes("url.protocol === 'http:' || url.protocol === 'https:'") && server.includes("href.startsWith('/')")],
  ['the admin previews a chosen image', adminJs.includes('[data-nika-image]') && adminJs.includes("dispatchEvent(new Event('nika:fill'))")],
  ['the page the guide is on is read from the snapshot it sends', server.includes('body.pageContext && typeof body.pageContext') && server.includes("typeof body.page === 'string' && !snapshot.path")],
  ['the same appearance settings exist here', ['panelColour','panelOpacity','gradientFrom','gradientTo','scrollbarColour','shadowColour','textColour','iconColour','customCss','logoSize','markSize','disclaimer'].every(name => server.includes(`${name}:`) && adminHtml.includes(`name="${name}"`))],
  ['the admin floats the real guide, not a mock', adminJs.includes("import('/nika/guide-shell.js')") && adminJs.includes('previewGuide.update(previewSettings())') && adminJs.includes('isolate:true')],
  ['ships the guide this site runs, byte for byte', packagedShell === guideShell && packagedWidget === guideWidget && packagedCss === guideCss]
];

console.log('=== universal self-hosted adapter ===');
let failed = false;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  failed ||= !pass;
}
assert.equal(failed, false);
console.log('\nall passed');

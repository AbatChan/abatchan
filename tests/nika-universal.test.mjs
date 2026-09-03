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
const universalLicence = readFileSync(new URL('universal/nika-universal/lib/licence.js', root), 'utf8');
const plugin = readFileSync(new URL('wordpress/nika-site-guide/nika-site-guide.php', root), 'utf8');

// Both editions carry their own copy of the package table because they ship
// separately and neither can import from the other. Duplication is fine; the two
// disagreeing is not, so read both and compare.
const phpPackages = Object.fromEntries(
  [...plugin.slice(plugin.indexOf('function nika_packages()'), plugin.indexOf('/** The package a capability first appears in'))
    .matchAll(/'(personal|business|agency)'\s*=>\s*array\(([^)]*)\)/g)]
    .map(([, name, body]) => [name, [...body.matchAll(/'([a-z_]+)'/g)].map(match => match[1])])
);
const { PACKAGES: jsPackages } = await import(new URL('universal/nika-universal/lib/licence.js', root));
const adminJs = readFileSync(new URL('universal/nika-universal/public/admin.js', root), 'utf8');

// A customer unzips only `nika-universal/`, and the Dockerfile copies only that
// directory. Any import that escapes the package root resolves on a developer
// machine and fails on every real install, so the package is checked for
// self-containment rather than trusted.
const packageFiles = ['server.mjs', 'site-index.mjs', 'index-static-site.mjs'];
const escaping = [];
for (const name of packageFiles) {
  const source = readFileSync(new URL(`universal/nika-universal/${name}`, root), 'utf8');
  for (const match of source.matchAll(/\bfrom\s+'([^']+)'/g)) {
    const specifier = match[1];
    if (specifier.startsWith('../')) escaping.push(`${name} -> ${specifier}`);
  }
}
assert.deepEqual(escaping, [], `packaged modules must not import above the package root: ${escaping.join(', ')}`);
assert.doesNotThrow(() => readFileSync(new URL('universal/nika-universal/lib/context-awareness.js', root), 'utf8'), 'shared server logic must be vendored into the package');

const checks = [
  ['both editions name the same three packages', JSON.stringify(Object.keys(phpPackages).sort()) === JSON.stringify(Object.keys(jsPackages).sort())],
  ['and put every capability in the same one', Object.keys(jsPackages).every(name => JSON.stringify([...(phpPackages[name] || [])].sort()) === JSON.stringify([...jsPackages[name]].sort()))],

  ['the licence key is read from the environment, never the config file', server.includes("const LICENCE_KEY = process.env.NIKA_LICENCE_KEY") && !server.includes('config.licenceKey') && env.includes('NIKA_LICENCE_KEY')],
  // Handing the key to the licence module is the point of reading it. What must
  // not happen is it crossing to the browser, so read the one function that
  // builds the admin response and check that only `configured` derives from it.
  ['and is never sent back to the browser', (() => {
    const body = server.slice(server.indexOf('function adminConfig()'), server.indexOf('function saveAdminConfig('));
    const mentions = body.match(/LICENCE_KEY/g) || [];
    return server.includes('The key itself is never sent back') && mentions.length === 1 && body.includes('configured: Boolean(LICENCE_KEY)');
  })()],
  ['booting never waits on the licence service', server.includes('licence.refresh({ activate: true }).catch(() => {})') && universalLicence.includes('Construction never waits on the network')],
  ['an unreachable service keeps the package last confirmed', universalLicence.includes("status: 'unreachable'") && universalLicence.includes("tier: state.confirmed || 'personal'")],
  ['which survives a restart, because it is written to disk', universalLicence.includes('writeState(statePath') && server.includes("statePath: join(DATA_DIR, 'licence.json')")],
  ['being over the site count keeps the package', universalLicence.includes('const entitled = Boolean(data.valid) || Boolean(data.overLimit);')],
  ['nothing in the licence path can stop the guide', !server.includes('if (!licence.can') || !/if \(!licence\.can\('(?:navigation|dictation)/.test(server)],

  ['branding follows the package, and absent means branded', server.includes("branding: licence.can('unbranded') ? config.branding !== false : true") && server.includes('branding: config.branding !== false')],
  ['and is gated where the value is written, not in the admin page', server.includes("branding: licence.can('unbranded') ? input.branding !== false : true") && server.includes('A hand-made POST')],

  ['moving a configuration checks the package as well as the token', server.includes("if (!licence.can('config_transfer'))") && server.includes("'/nika/admin/config-export'") && server.includes("'/nika/admin/config-import'")],
  // The AI key, admin token and licence key are all env-only, so the export is
  // safe by construction rather than by remembering to strip anything.
  ['an export cannot leak a credential it never held', server.includes('never in the file') && !/settings: \{[^}]*(?:apiKey|adminToken|licenceKey)/.test(server) && server.includes('settings: config }')],
  ['an import is saved through the same path as the admin form', server.includes('saveAdminConfig({ ...config, ...incoming })')],
  ['a file that is not an export is refused', server.includes("document_.nika !== 'settings'") && server.includes('is not a Nika settings export')],
  ['images from the other site are dropped rather than hotlinked', server.includes("for (const field of ['avatar', 'launcherIcon'])") && server.includes('hosted on the site the file came from')],
  ['the guide is not switched on where there is no AI key', server.includes('if (incoming.enabled !== false && !API_KEY)')],
  ['the report is only sent when the package includes it', server.includes("licence.can('question_report') ? unansweredQuestions() : null")],
  ['the browser tells an empty report from an excluded one', adminJs.includes('Array.isArray(licence.unanswered)?licence.unanswered:null') && adminJs.includes('if(!rows){') && adminJs.includes('}else if(!rows.length){')],
  ['questions are grouped and counted, not listed per visitor', server.includes('function unansweredQuestions(') && server.includes('row.count += 1;')],
  ['the licence is explained where an owner will look for it', readme.includes('NIKA_LICENCE_KEY') && readme.includes('Nika runs with or without a key')],

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

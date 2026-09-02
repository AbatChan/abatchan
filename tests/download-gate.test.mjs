// The archive is closed unless a licence opens it.
//
// Everything here is a boundary someone could otherwise walk through: no key, a
// key from another product, a tampered grant, an expired grant, a grant widened
// to a different build, and a term that has ended. Each one has to refuse, and
// refuse without needing the licence service to be reachable to do so.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.NIKA_VARIANT_PERSONAL = '101';
process.env.NIKA_VARIANT_BUSINESS = '202';
process.env.NIKA_VARIANT_AGENCY = '303';
process.env.NIKA_LEMON_STORE_ID = '459322';
process.env.NIKA_DOWNLOAD_SECRET = 'test-secret-of-sufficient-length';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

let lemonReplies = [];
let lemonCalls = [];
let signedRequests = [];
let settingsRows = {};

global.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('api.lemonsqueezy.com')) {
    lemonCalls.push(target);
    const reply = lemonReplies.shift();
    if (reply === 'unreachable') throw new Error('network down');
    return { json: async () => reply };
  }
  if (target.includes('/storage/v1/object/sign/')) {
    signedRequests.push(target);
    const missing = target.includes('9.9.9');
    return { ok: !missing, json: async () => (missing ? {} : { signedURL: `/object/sign/releases/x?token=abc` }) };
  }
  if (target.includes('/rest/v1/settings')) {
    if ((options.method || 'GET') === 'GET') {
      const key = decodeURIComponent((target.match(/key=eq\.([^&]+)/) || [])[1] || '');
      return { ok: true, json: async () => (settingsRows[key] ? [{ value: settingsRows[key] }] : []) };
    }
    const row = JSON.parse(options.body)[0];
    settingsRows[row.key] = row.value;
    return { ok: true, json: async () => [row] };
  }
  throw new Error(`Unexpected request: ${target}`);
};

const { default: download } = await import('../api/download.js');
const { default: update } = await import('../api/update.js');
const { signDownload } = await import('../lib/licence/download-token.js');

const response = () => ({
  code: 200, body: null, headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
  end() { return this; }
});

const licenceReply = ({ valid = true, variant = '202', store = '459322', expires = '2099-01-01T00:00:00Z' } = {}) => ({
  valid,
  error: valid ? null : 'license_key not found.',
  license_key: { status: 'active', activation_limit: 5, activation_usage: 1, expires_at: expires },
  meta: { variant_id: variant, store_id: store, customer_email: 'buyer@example.test' }
});

const get = async (handler, query) => {
  const res = response();
  lemonCalls = [];
  await handler({ method: 'GET', query }, res);
  return res;
};

// --- the door is shut by default ------------------------------------------

{
  const res = await get(download, { edition: 'wordpress', version: '1.5.3' });
  assert.equal(res.code, 401, 'no key must not yield a build');
  assert.equal(lemonCalls.length, 0, 'a keyless request never reaches the licence service');
}

{
  lemonReplies = [licenceReply({ variant: '999' })];
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', key: 'OTHER-PRODUCT' });
  assert.equal(res.code, 403);
  assert.match(res.body.message, /not issued for Nika/i);
}

{
  lemonReplies = [licenceReply({ store: '111111' })];
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', key: 'OTHER-STORE' });
  assert.equal(res.code, 403, 'a key from another store is not a Nika key');
}

// An unreachable licence service must not open the archive. This is the one
// place the "never block" rule does not apply: not being handed a new build is
// not the same as having Nika stop working.
{
  lemonReplies = ['unreachable'];
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', key: 'NIKA-VALID' });
  assert.equal(res.code, 503);
  assert.doesNotMatch(String(res.headers.Location || ''), /signedURL|storage/);
}

// --- a valid key gets exactly one build ------------------------------------

{
  lemonReplies = [licenceReply()];
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 302);
  assert.match(res.headers.Location, /storage\/v1\/object\/sign/);
  assert.equal(settingsRows['nika.entitled.LID-KEY9'].wordpress, '1.5.3', 'a served build raises the high-water mark');
}

{
  lemonReplies = [licenceReply()];
  const res = await get(download, { edition: 'wordpress', version: '9.9.9', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 404, 'a version that is not in the archive is not a redirect');
}

{
  lemonReplies = [licenceReply()];
  const res = await get(download, { edition: 'sideloaded', version: '1.5.3', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 400);
}

// --- an ended term keeps what it was given, and no more --------------------

{
  lemonReplies = [licenceReply({ expires: '2020-01-01T00:00:00Z' })];
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 302, 'a lapsed customer may still reinstall what their term covered');
}

{
  lemonReplies = [licenceReply({ expires: '2020-01-01T00:00:00Z' })];
  const res = await get(download, { edition: 'wordpress', version: '1.6.0', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 403);
  assert.match(res.body.message, /update term has ended/i);
}

{
  lemonReplies = [licenceReply({ expires: '2020-01-01T00:00:00Z' })];
  const res = await get(download, { edition: 'universal', version: '1.5.3', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.code, 403, 'the mark is per edition; WordPress history does not unlock Universal');
}

// --- signed grants are worth exactly what they say -------------------------

{
  const token = signDownload({ edition: 'wordpress', version: '1.5.3', keyTail: 'VALID-KEY9' });
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', token });
  assert.equal(res.code, 302);
  assert.equal(lemonCalls.length, 0, 'a grant is self-contained and costs no licence call');
}

{
  const token = signDownload({ edition: 'wordpress', version: '1.5.3', keyTail: 'VALID-KEY9' });
  const res = await get(download, { edition: 'universal', version: '1.5.3', token });
  assert.equal(res.code, 403, 'a grant cannot be rewritten into a different edition');
}

{
  const token = signDownload({ edition: 'wordpress', version: '1.5.3', keyTail: 'VALID-KEY9' });
  const res = await get(download, { edition: 'wordpress', version: '1.6.0', token });
  assert.equal(res.code, 403, 'a grant cannot be rewritten into a different version');
}

{
  const token = signDownload({ edition: 'wordpress', version: '1.5.3', keyTail: 'VALID-KEY9' });
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', token: `${token.slice(0, -3)}zzz` });
  assert.equal(res.code, 403, 'a tampered grant is refused');
}

{
  const stale = signDownload({ edition: 'wordpress', version: '1.5.3', keyTail: 'VALID-KEY9', seconds: -60 });
  const res = await get(download, { edition: 'wordpress', version: '1.5.3', token: stale });
  assert.equal(res.code, 403);
  assert.equal(res.body.reason, 'expired');
}

// --- the manifest tells everyone the news and only buyers the address ------

{
  const res = await get(update, { edition: 'wordpress' });
  assert.equal(res.code, 200);
  assert.ok(res.body.version, 'a site with no key still learns a version exists');
  assert.ok(res.body.sections.changelog, 'and what is in it');
  assert.equal(res.body.package, '', 'but not where to get it');
}

{
  lemonReplies = [licenceReply()];
  const res = await get(update, { edition: 'wordpress', key: 'NIKA-VALID-KEY9' });
  assert.match(res.body.package, /^https:\/\/abatchan\.com\/api\/download\?/);
  assert.match(res.body.package, /token=/);
  assert.doesNotMatch(res.body.package, /NIKA-VALID-KEY9/, 'the licence key never travels in the package URL');
  assert.equal(res.body.licence.state, 'valid');
}

{
  lemonReplies = [licenceReply({ expires: '2020-01-01T00:00:00Z' })];
  const res = await get(update, { edition: 'wordpress', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.body.package, '');
  assert.equal(res.body.licence.state, 'expired');
}

{
  lemonReplies = ['unreachable'];
  const res = await get(update, { edition: 'wordpress', key: 'NIKA-VALID-KEY9' });
  assert.equal(res.body.package, '');
  assert.equal(res.body.licence.state, 'unreachable', 'a bad minute at Lemon Squeezy is not an invalid key');
}

// --- nothing paid is left sitting on the deploy ----------------------------

const ignore = readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8');
for (const path of ['releases/', 'wordpress/', 'universal/', 'scripts/']) {
  assert.ok(ignore.split('\n').includes(path), `${path} must not be uploaded to a deploy that serves the repository root`);
}

const plugin = readFileSync(new URL('../wordpress/nika-site-guide/nika-site-guide.php', import.meta.url), 'utf8');
assert.ok(plugin.includes("const NIKA_UPDATE_MANIFEST = 'https://abatchan.com/api/update';"), 'the plugin asks the endpoint, not a static file');
assert.ok(plugin.includes("empty( $manifest['package'] )"), 'an update with no package is never offered');

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const sources = vercel.redirects.map(rule => rule.source);
assert.ok(sources.includes('/downloads/:path*'), 'the old public archive path is answered, not left to chance');
assert.ok(sources.includes('/lib/:path*'), 'server modules are not readable over HTTP');

console.log('download gate: ok');

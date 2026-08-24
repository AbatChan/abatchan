import { createSupabaseTenantStore, tenantSettingKey } from '../lib/tenants/store.js';

let failures = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got:      ${got}\n        expected: ${want}`}`);
};

const records = [
  { id: 'alpha', siteKey: 'site_alpha', origins: ['alpha.test'] },
  { id: 'beta', siteKey: 'site_beta', origins: ['beta.test'] }
];
const requests = [];
let clock = 1_000;
let storeAvailable = true;
const fetchImpl = async (url, options) => {
  requests.push({ url: String(url), options });
  if (!storeAvailable) return { ok: false, status: 503, json: async () => ({}) };
  const parsed = new URL(url);
  const filter = parsed.searchParams.get('key');
  const selected = filter.startsWith('eq.')
    ? records.filter(record => tenantSettingKey(record.siteKey) === filter.slice(3))
    : records;
  return { ok: true, status: 200, json: async () => selected.map(value => ({ value })) };
};

const store = createSupabaseTenantStore({
  fetchImpl,
  url: 'https://store.test',
  secret: 'sb_secret_test',
  ttlMs: 100,
  now: () => clock
});

console.log('=== tenant records are read privately by site key ===');
check('known key resolves', (await store.get('site_alpha')).id, 'alpha');
check('query addresses the private settings row', new URL(requests[0].url).searchParams.get('key'), 'eq.assistant.tenant.site_alpha');
check('service key is sent as apikey', requests[0].options.headers.apikey, 'sb_secret_test');
check('service key is sent as bearer authorization', requests[0].options.headers.Authorization, 'Bearer sb_secret_test');
check('unknown key is null', await store.get('site_missing'), null);
check('unsafe filter input is rejected without a request', await store.get('site.bad,or'), null);
check('unsafe input did not touch the store', requests.length, 2);

console.log('\n=== records are cached briefly, then refreshed ===');
await store.get('site_alpha');
check('a warm lookup makes no request', requests.length, 2);
clock += 101;
await store.get('site_alpha');
check('an expired lookup is refreshed', requests.length, 3);

console.log('\n=== preflight can inspect every authorised origin ===');
clock += 101;
const all = await store.all();
check('all records are returned', all.length, 2);
check('list query uses the tenant namespace', new URL(requests.at(-1).url).searchParams.get('key'), 'like.assistant.tenant.*');
await store.get('site_beta');
check('the list warms individual lookups', requests.length, 4);

console.log('\n=== a warm function survives a temporary store outage ===');
storeAvailable = false;
clock += 101;
check('an expired record falls back to its last verified value', (await store.get('site_alpha')).id, 'alpha');
check('an expired origin list falls back to its last verified value', (await store.all()).length, 2);

const coldStore = createSupabaseTenantStore({
  fetchImpl,
  url: 'https://store.test',
  secret: 'sb_secret_test'
});
let coldFailure = '';
try { await coldStore.get('site_alpha'); } catch (error) { coldFailure = error.message; }
check('a cold function fails closed instead of inventing a tenant', coldFailure, 'Tenant store returned 503');

console.log(`\n${failures ? `${failures} FAILED` : 'all passed'}`);
process.exit(failures ? 1 : 0);

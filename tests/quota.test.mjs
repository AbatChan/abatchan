// Exercises api/quota.js against an in-memory stand-in for the settings table.
// No network, no real Supabase, no spent budget.
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.SUPABASE_URL = 'https://stub.local';
process.env.ASSISTANT_DAILY_MAX = '5';
process.env.ASSISTANT_IP_DAILY_MAX = '2';

const table = new Map();
let sweeps = 0;

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method || 'GET';

  if (u.includes('/rpc/assistant_consume')) {
    // Simulate schema.sql not yet applied, so the REST fallback is what runs.
    return { ok: false, status: 404, json: async () => ({}) };
  }
  if (method === 'DELETE') {
    sweeps++;
    return { ok: true };
  }
  if (method === 'POST') {
    for (const row of JSON.parse(opts.body)) table.set(row.key, row.value);
    return { ok: true };
  }
  const keys = [...u.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const rows = keys
    .filter(key => table.has(key))
    .map(key => ({ key, value: table.get(key) }));
  return { ok: true, json: async () => rows };
};

const { consume, limits } = await import('../api/quota.js');

let failures = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${got}${ok ? '' : `   (expected ${want})`}`);
};

console.log(`limits: ${limits.daily}/day site-wide, ${limits.perIp}/day per connection\n`);

console.log('--- one visitor hitting their personal ceiling ---');
for (let n = 1; n <= 4; n++) {
  const result = await consume('9.9.9.9');
  const state = result.allowed
    ? `allowed (personal left ${result.personal}, site left ${result.remaining})`
    : `blocked: ${result.reason}`;
  check(
    `request ${n}`,
    state,
    n <= 2
      ? `allowed (personal left ${2 - n}, site left ${5 - n})`
      : 'blocked: ip_daily'
  );
}

console.log('\n--- the site ceiling, reached by separate visitors ---');
const seen = [];
for (let n = 1; n <= 4; n++) {
  const result = await consume(`10.0.0.${n}`);
  seen.push(result.allowed ? 'allowed' : `blocked:${result.reason}`);
}
// 2 already spent by 9.9.9.9, so 3 more land and the 4th meets the site wall.
check(
  'four fresh visitors',
  seen.join(','),
  'allowed,allowed,allowed,blocked:daily'
);

console.log('\n--- a visitor arriving after the site is spent ---');
const late = await consume('8.8.8.8');
check('blocked by site, not personal', `${late.allowed}/${late.reason}`, 'false/daily');

console.log('\n--- privacy: no raw IP is ever written ---');
const stored = JSON.stringify([...table.entries()]);
check('no IP in stored keys/values', /9\.9\.9\.9|10\.0\.0\.|8\.8\.8\.8/.test(stored), false);
check(
  'per-connection rows are private',
  [...table.entries()]
    .filter(([key]) => key.startsWith('assistant.ip.'))
    .every(([, value]) => value && typeof value.count === 'number'),
  true
);
check('stale rows swept once on first request of day', sweeps > 0, true);

console.log(`\n${failures ? `${failures} FAILED` : 'all passed'}`);
process.exit(failures ? 1 : 0);

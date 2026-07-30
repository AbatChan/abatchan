// Verifies the graduated tier boundaries and that a late visitor is served.
// Everything runs against an in-memory settings table.
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.SUPABASE_URL = 'https://stub.local';
process.env.ASSISTANT_DAILY_MAX = '600';
process.env.ASSISTANT_IP_DAILY_MAX = '30';
process.env.ASSISTANT_EXEMPT_IPS = '9.9.9.9';

const table = new Map();

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method || 'GET';
  if (u.includes('/rpc/')) return { ok: false, status: 404, json: async () => ({}) };
  if (method === 'DELETE') return { ok: true };
  if (method === 'POST') {
    for (const row of JSON.parse(opts.body)) table.set(row.key, row.value);
    return { ok: true };
  }
  const keys = [...u.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  return {
    ok: true,
    json: async () => keys
      .filter(key => table.has(key))
      .map(key => ({ key, value: table.get(key) }))
  };
};

const { consume, capFor } = await import('../api/quota.js');

let failures = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ${got}${ok ? '' : `  (want ${want})`}`);
};

console.log('tier boundaries at pool 600, base cap 30');
check('  0 spent (0%)', capFor(0), 30);
check('299 spent (49.8%)', capFor(299), 30);
check('300 spent (50%)', capFor(300), 12);
check('479 spent (79.8%)', capFor(479), 12);
check('480 spent (80%)', capFor(480), 5);
check('599 spent', capFor(599), 5);

console.log('\nexempt IP never spends the pool');
for (let i = 0; i < 50; i++) await consume('9.9.9.9');
const usage = [...table.entries()].find(([key]) => key.startsWith('assistant.usage'));
check('pool untouched after 50 exempt requests', usage ? usage[1].count : 0, 0);

console.log('\nheavy user throttled as pool drains');
// Drain to 50% with distinct visitors, then see what one heavy user can take.
for (let i = 0; i < 300; i++) {
  await consume(`10.0.${Math.floor(i / 250)}.${i % 250}`);
}
let got = 0;
for (let i = 0; i < 40; i++) {
  if ((await consume('7.7.7.7')).allowed) got++;
}
check('heavy user capped at tier-2 allowance', got, 12);

console.log('\nlate visitor with a short question still served');
// Use deterministic, unique addresses so this suite cannot become flaky.
let drain = 0;
while (true) {
  const result = await consume(`11.0.${Math.floor(drain / 250)}.${drain % 250}`);
  drain++;
  if (result.remaining <= 60) break;
}
const late = [];
for (let i = 0; i < 3; i++) late.push((await consume('8.8.8.8')).allowed);
check('3 questions from a fresh late visitor', late.join(','), 'true,true,true');

console.log(`\n${failures ? `${failures} FAILED` : 'all passed'}`);
process.exit(failures ? 1 : 0);

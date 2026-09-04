// The licence dashboard hands over a customer's own site list, so the only thing
// standing between a stranger and it is the key check. Everything here is a way
// round that check, or a way to act on somebody else's row.

import assert from 'node:assert/strict';

process.env.NIKA_VARIANT_PERSONAL = '101';
process.env.NIKA_VARIANT_BUSINESS = '202';
process.env.NIKA_VARIANT_AGENCY = '303';
process.env.NIKA_LEMON_STORE_ID = '459322';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

let lemonReplies = [], lemonCalls = [], rows = [], deleted = [];

global.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('api.lemonsqueezy.com')) {
    lemonCalls.push({ url: target, body: String(options.body || '') });
    const reply = lemonReplies.shift();
    if (reply === 'unreachable') throw new Error('down');
    return { json: async () => reply };
  }
  if (target.includes('/rest/v1/settings')) {
    if ((options.method || 'GET') === 'DELETE') {
      deleted.push(decodeURIComponent((target.match(/key=eq\.([^&]+)/) || [])[1] || ''));
      return { ok: true, json: async () => [] };
    }
    const like = decodeURIComponent((target.match(/key=like\.([^&]+)/) || [])[1] || '');
    const prefix = like.replace(/%$/, '');
    return { ok: true, json: async () => rows.filter(row => row.key.startsWith(prefix)) };
  }
  throw new Error(`Unexpected request: ${target}`);
};

const { default: handler } = await import('../api/activations.js');

const response = () => ({ code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const licenceReply = ({ valid = true, variant = '303', store = '459322' } = {}) => ({
  valid, error: valid ? null : 'license_key not found.',
  license_key: { status: 'active', activation_limit: 50, activation_usage: 2, expires_at: '2099-01-01T00:00:00Z' },
  meta: { variant_id: variant, store_id: store, customer_email: 'buyer@example.test' }
});

const call = async (body, replies = [licenceReply()]) => {
  lemonReplies = replies; lemonCalls = []; deleted = [];
  const res = response();
  await handler({ method: 'POST', body }, res);
  return res;
};

// Two sites on this key, one on somebody else's, so a leak is visible.
const seed = () => { rows = [
  { key: 'nika.activation.LID-KEY9.aG9zdC1vbmU', value: { host: 'one.example', instanceId: 'i-1', seenAt: '2026-09-01T00:00:00Z' } },
  { key: 'nika.activation.LID-KEY9.aG9zdC10d28', value: { host: 'two.example', instanceId: 'i-2', seenAt: '2026-09-03T00:00:00Z' } },
  { key: 'nika.activation.OTHERKEY.c29tZW9uZQ', value: { host: 'not-yours.example', instanceId: 'i-3', seenAt: '2026-09-02T00:00:00Z' } }
]; };

seed();

{
  const res = await call({ action: 'list' }, []);
  assert.equal(res.code, 400, 'no key is refused before any lookup');
  assert.equal(lemonCalls.length, 0);
}

{
  const res = await call({ key: 'NOT-A-NIKA-KEY', action: 'list' }, [licenceReply({ variant: '999' })]);
  assert.equal(res.code, 403);
  assert.match(res.body.error, /not issued for Nika/i);
  assert.equal(res.body.sites, undefined, 'a refusal returns no rows at all');
}

{
  const res = await call({ key: 'WRONG-STORE', action: 'list' }, [licenceReply({ store: '111' })]);
  assert.equal(res.code, 403);
}

{
  const res = await call({ key: 'NIKA-VALID-LID-KEY9', action: 'list' });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.sites.map(s => s.host), ['two.example', 'one.example'], 'newest first, and only this key\'s');
  assert.equal(res.body.sites.some(s => s.host === 'not-yours.example'), false, 'another key\'s site never appears');
  assert.equal(res.body.sitesAllowed, 50);
}

// The row id comes from the caller, so it is the obvious way to reach across.
{
  const res = await call({ key: 'NIKA-VALID-LID-KEY9', action: 'deactivate', id: 'nika.activation.OTHERKEY.c29tZW9uZQ', instanceId: 'i-3' });
  assert.equal(res.code, 403);
  assert.match(res.body.error, /not on this licence/i);
  assert.equal(deleted.length, 0, 'nothing is deleted on a refusal');
}

{
  const res = await call(
    { key: 'NIKA-VALID-LID-KEY9', action: 'deactivate', id: 'nika.activation.LID-KEY9.aG9zdC1vbmU', instanceId: 'i-1' },
    [licenceReply(), { deactivated: true }]
  );
  assert.equal(res.code, 200);
  assert.equal(deleted[0], 'nika.activation.LID-KEY9.aG9zdC1vbmU');
  assert.match(lemonCalls[1].url, /\/deactivate$/, 'Lemon Squeezy owns the count and hears about it');
}

// A failure at Lemon Squeezy must not leave our list claiming the slot is free.
{
  seed();
  const res = await call(
    { key: 'NIKA-VALID-LID-KEY9', action: 'deactivate', id: 'nika.activation.LID-KEY9.aG9zdC1vbmU', instanceId: 'i-1' },
    [licenceReply(), { deactivated: false, error: 'no' }]
  );
  assert.equal(res.code, 502);
  assert.equal(deleted.length, 0, 'our record survives when theirs did not change');
}

{
  const res = await call({ key: 'NIKA-VALID-LID-KEY9', action: 'list' }, ['unreachable']);
  assert.equal(res.code, 503);
  assert.match(res.body.error, /could not be reached/i);
  assert.match(res.body.error, /Nothing has changed/i);
}

{
  const res = await call({ key: 'NIKA-VALID-LID-KEY9', action: 'wipe' });
  assert.equal(res.code, 400);
}

// The key is the credential and must never come back out.
{
  const res = await call({ key: 'NIKA-VALID-LID-KEY9', action: 'list' });
  assert.equal(JSON.stringify(res.body).includes('NIKA-VALID'), false, 'the key is never echoed');
}

console.log('activation dashboard: ok');

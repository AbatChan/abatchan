import assert from 'node:assert/strict';

process.env.NIKA_VARIANT_PERSONAL = '101';
process.env.NIKA_VARIANT_BUSINESS = '202';
process.env.NIKA_VARIANT_AGENCY = '303';
process.env.NIKA_LEMON_STORE_ID = '459322';

const originalFetch = global.fetch;
let lemonReplies = [];
let lemonCalls = [];

global.fetch = async (url, options = {}) => {
  if (String(url).includes('api.lemonsqueezy.com')) {
    lemonCalls.push({ url: String(url), body: String(options.body || '') });
    const reply = lemonReplies.shift();
    return { json: async () => reply };
  }
  throw new Error(`Unexpected request: ${url}`);
};

const { default: handler } = await import('../api/licence.js?test=product-boundary');

const response = () => ({
  code: 200,
  body: null,
  setHeader() {},
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

const licenceReply = ({ valid = true, variant = '202', store = '459322', status = 'active' } = {}) => ({
  valid,
  error: valid ? null : 'license_key not found.',
  license_key: { status, activation_limit: 5, activation_usage: 1, expires_at: '2099-01-01T00:00:00Z' },
  meta: { variant_id: variant, store_id: store, customer_email: 'buyer@example.test' }
});

{
  lemonCalls = [];
  lemonReplies = [licenceReply()];
  const res = response();
  await handler({ method: 'POST', body: { action: 'validate', key: 'NIKA-VALID', site: 'example.com' } }, res);
  assert.equal(res.body.valid, true);
  assert.equal(res.body.entitlement.tier, 'business');
  assert.equal(res.body.entitlement.sitesAllowed, 5);
  assert.equal(lemonCalls.length, 1);
}

{
  lemonCalls = [];
  lemonReplies = [licenceReply({ variant: '999' })];
  const res = response();
  await handler({ method: 'POST', body: { action: 'activate', key: 'OTHER-PRODUCT', site: 'example.com' } }, res);
  assert.equal(res.body.valid, false);
  assert.equal(res.body.entitlement.tier, null);
  assert.equal(res.body.entitlement.sitesAllowed, 0);
  assert.match(res.body.message, /not issued for Nika/i);
  assert.equal(lemonCalls.length, 1, 'an unknown product must not receive an activation call');
  assert.match(lemonCalls[0].url, /\/validate$/);
}

{
  lemonCalls = [];
  lemonReplies = [licenceReply({ store: '111111' })];
  const res = response();
  await handler({ method: 'POST', body: { action: 'validate', key: 'OTHER-STORE', site: 'example.com' } }, res);
  assert.equal(res.body.valid, false);
  assert.equal(res.body.entitlement.tier, null);
}

{
  lemonCalls = [];
  lemonReplies = [licenceReply()];
  const res = response();
  await handler({ method: 'POST', body: { action: 'activate', key: 'NIKA-STAGING', site: 'demo.vercel.app' } }, res);
  assert.equal(res.body.valid, true);
  assert.equal(res.body.entitlement.siteKind, 'development');
  assert.equal(lemonCalls.length, 1, 'development installs only validate');
  assert.match(lemonCalls[0].url, /\/validate$/);
}

{
  lemonCalls = [];
  lemonReplies = [licenceReply(), { activated: true, error: null, license_key: licenceReply().license_key, instance: { id: 'instance-1' }, meta: licenceReply().meta }];
  const res = response();
  await handler({ method: 'POST', body: { action: 'activate', key: 'NIKA-LIVE', site: 'customer.com' } }, res);
  assert.equal(res.body.valid, true);
  assert.equal(res.body.instanceId, 'instance-1');
  assert.equal(lemonCalls.length, 2);
  assert.match(lemonCalls[0].url, /\/validate$/);
  assert.match(lemonCalls[1].url, /\/activate$/);
}

global.fetch = originalFetch;
console.log('licence product boundary: ok');

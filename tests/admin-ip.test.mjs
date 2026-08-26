import assert from 'node:assert/strict';

const originalFetch = global.fetch;
global.fetch = async () => ({ ok: true, json: async () => ({ id: 'admin-user' }) });

const { default: handler, requestIp } = await import('../api/admin-ip.js?test=1');

const response = () => ({
  code: 200,
  headers: {},
  body: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

assert.equal(requestIp({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }, socket: {} }), '203.0.113.7');
assert.equal(requestIp({ headers: {}, socket: { remoteAddress: '::ffff:192.0.2.9' } }), '192.0.2.9');
assert.equal(requestIp({ headers: { 'x-real-ip': '2001:db8::7' }, socket: {} }), '2001:db8::7');
assert.equal(requestIp({ headers: { 'x-forwarded-for': 'not-an-ip' }, socket: {} }), '');

{
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer valid', 'x-forwarded-for': '198.51.100.21' }, socket: {} }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ip: '198.51.100.21' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
}

{
  global.fetch = async () => ({ ok: false, json: async () => ({}) });
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer expired' }, socket: {} }, res);
  assert.equal(res.code, 401);
  global.fetch = async () => ({ ok: true, json: async () => ({ id: 'admin-user' }) });
}

{
  const res = response();
  await handler({ method: 'POST', headers: {}, socket: {} }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'GET');
}

global.fetch = originalFetch;
console.log('admin IP endpoint: ok');
